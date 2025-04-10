import { auth, db, storage } from './firebase.js';
import { updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

$(document).ready(function() {
    let userProfileData = {};

    // Load user profile data from Firestore
    const loadUserProfile = async () => {
        if (!auth.currentUser) return;
        
        const profileRef = doc(db, 'users', auth.currentUser.uid, 'private', 'profile');
        try {
            const docSnap = await getDoc(profileRef);
            if (docSnap.exists()) {
                userProfileData = docSnap.data();
            } else {
                // Initialize with default values
                userProfileData = {
                    name: auth.currentUser.displayName || '',
                    email: auth.currentUser.email,
                    gender: '',
                    phone: '',
                    photoURL: auth.currentUser.photoURL || ''
                };
                await updateDoc(profileRef, userProfileData);
            }
        } catch (error) {
            console.error("Error loading profile:", error);
        }
        
        updateProfileDisplay();
    };

    // Save user profile to Firestore
    const saveUserProfile = async () => {
        if (!auth.currentUser) return false;
        
        const profileRef = doc(db, 'users', auth.currentUser.uid, 'private', 'profile');
        try {
            await updateDoc(profileRef, userProfileData);
            
            // Update auth profile if name or photo changed
            if (userProfileData.name || userProfileData.photoURL) {
                await updateProfile(auth.currentUser, {
                    displayName: userProfileData.name,
                    photoURL: userProfileData.photoURL
                });
            }
            
            return true;
        } catch (error) {
            console.error("Error saving profile:", error);
            return false;
        }
    };

    // Update profile display in sidebar and profile page
    const updateProfileDisplay = () => {
        if (!auth.currentUser) return;
        
        // Update sidebar
        $('#profile-name').text(userProfileData.name || 'User Name');
        $('#profile-email').text(userProfileData.email || 'user@example.com');
        
        // Update profile picture
        const profilePicInitial = $('#profile-pic-initial');
        const profilePicImage = $('#profile-pic-image');
        
        if (userProfileData.photoURL) {
            profilePicInitial.addClass('d-none');
            profilePicImage.removeClass('d-none').attr('src', userProfileData.photoURL);
        } else {
            profilePicInitial.removeClass('d-none').text(userProfileData.name ? userProfileData.name.charAt(0).toUpperCase() : 'U');
            profilePicImage.addClass('d-none');
        }
        
        // Update profile page fields
        $('#profile-name-input').val(userProfileData.name || '');
        $('#profile-email-input').val(userProfileData.email || '');
        $('#profile-gender').val(userProfileData.gender || '');
        $('#profile-phone').val(userProfileData.phone || '');
        
        // Update profile preview
        const previewInitial = $('#profile-pic-preview-initial');
        const previewImage = $('#profile-pic-preview-image');
        
        if (userProfileData.photoURL) {
            previewInitial.addClass('d-none');
            previewImage.removeClass('d-none').attr('src', userProfileData.photoURL);
        } else {
            previewInitial.removeClass('d-none').text(userProfileData.name ? userProfileData.name.charAt(0).toUpperCase() : 'U');
            previewImage.addClass('d-none');
        }
    };

    // Upload profile picture to storage
    const uploadProfilePicture = async (file) => {
        if (!auth.currentUser) return null;
        
        try {
            const storageRef = ref(storage, `profile-pictures/${auth.currentUser.uid}`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);
            return downloadURL;
        } catch (error) {
            console.error("Error uploading profile picture:", error);
            return null;
        }
    };

    // Event handlers
    $(document).on('click', '#edit-profile-btn', async () => {
        showPage('profile-page');
    });

    $(document).on('click', '#cancel-profile-btn', async () => {
        showPage('calendar-page');
    });
    $(document).on('click', '#change-profile-pic-btn', async () => {
        $('#profile-picture-input').click();
    });

    // Profile picture file input change
    $('#profile-picture-input').change(async function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            // Show loading state
            $('#change-profile-pic-btn').html('<i class="fas fa-spinner fa-spin"></i> Uploading...');
            
            // Upload the file
            const downloadURL = await uploadProfilePicture(file);
            if (downloadURL) {
                userProfileData.photoURL = downloadURL;
                updateProfileDisplay();
            }
        } catch (error) {
            console.error("Error uploading profile picture:", error);
            alert('Failed to upload profile picture');
        } finally {
            $('#change-profile-pic-btn').html('<i class="fas fa-camera"></i> Change Photo');
        }
    });

    // Save profile form
    $('#profile-form').submit(async function(e) {
        e.preventDefault();
        
        // Update userProfileData
        userProfileData.name = $('#profile-name-input').val();
        userProfileData.gender = $('#profile-gender').val();
        userProfileData.phone = $('#profile-phone').val();
        
        try {
            // Show loading state
            $('#save-profile-btn').html('<i class="fas fa-spinner fa-spin"></i> Saving...');
            
            // Save to Firestore
            const success = await saveUserProfile();
            if (success) {
                updateProfileDisplay();
                showPage('calendar-page');
                alert('Profile updated successfully!');
            }
        } catch (error) {
            console.error("Error saving profile:", error);
            alert('Failed to save profile');
        } finally {
            $('#save-profile-btn').html('Save Changes');
        }
    });

    // Load profile when profile page is shown
    $(document).on('click', '.nav-link[data-page="profile"]', function() {
        loadUserProfile();
    });
});