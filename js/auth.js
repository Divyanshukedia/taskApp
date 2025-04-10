import { auth } from './firebase.js';

$(document).ready(function() {
    // Login form handler
    $('#login-form').submit(async function(e) {
        e.preventDefault();
        const email = $('#login-email').val();
        const password = $('#login-password').val();
        
        try {
            await signInWithEmailAndPassword(auth, email, password);
            // Refresh the page to ensure clean state
            window.location.reload();
        } catch (error) {
            alert('Login failed: ' + error.message);
            // Clear password field on failed login
            $('#login-password').val('');
        }
    });

    // Logout button handler
    $(document).on('click', '#logout-btn', async () => {
        try {
            await signOut(auth);
            // Refresh the page to ensure clean state
            window.location.reload();
        } catch (error) {
            console.error("Logout error:", error);
        }
    });
});