import { auth } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

$(document).ready(function() {
    // View Management
    const viewManager = {
        currentView: 'calendar',
        
        init: function() {
            this.bindEvents();
            this.loadInitialView();
        },
        
        bindEvents: function() {
            $(document).on('click', '.nav-link', (e) => {
                e.preventDefault();
                const page = $(e.currentTarget).data('page');
                this.showView(page);
            });
        },
        
        loadInitialView: function() {
            // Load partials
            this.loadPartial('login-section', 'partials/login.html');
            this.loadPartial('sidebar', 'partials/sidebar.html');
            this.loadPartial('calendar-page', 'partials/calendar.html');
            this.loadPartial('tasks-page', 'partials/tasks.html');
            this.loadPartial('profile-page', 'partials/profile.html');
            
            // Set up auth state listener
            onAuthStateChanged(auth, (user) => {
                if (user) {
                    $('#login-section').addClass('d-none');
                    $('#app-container').removeClass('d-none');
                    this.showView('calendar');
                } else {
                    $('#login-section').removeClass('d-none');
                    $('#app-container').addClass('d-none');
                }
            });
        },
        
        loadPartial: function(elementId, url) {
            $.get(url, function(data) {
                $(`#${elementId}`).html(data);
            }).fail(function() {
                console.error(`Failed to load partial: ${url}`);
            });
        },
        
        showView: function(viewName) {
            // Hide all views
            $('.page-content').removeClass('active').addClass('d-none');
            
            // Show selected view
            $(`#${viewName}-page`).removeClass('d-none').addClass('active');
            
            // Update nav link states
            $('.nav-link').removeClass('active');
            $(`.nav-link[data-page="${viewName}"]`).addClass('active');
            
            this.currentView = viewName;
        }
    };

    // Initialize the app
    viewManager.init();
});