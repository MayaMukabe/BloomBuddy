// Authentication state management
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isLoading = true;
        this.initializeAuthListener();
    }

    // Listen for authentication state changes
    initializeAuthListener() {
        auth.onAuthStateChanged((user) => {
            this.isLoading = false;
            
            if (user) {
                this.currentUser = user;
                this.onUserSignedIn(user);
            } else {
                this.currentUser = null;
                this.onUserSignedOut();
            }
        });
    }

    // Handle user sign-in
    async signInWithGoogle() {
        try {
            this.showLoading(true);
            const result = await auth.signInWithPopup(googleProvider);
            const user = result.user;
            
            console.log('User signed in:', user.displayName);
            
            // Save user data to Firestore
            await this.saveUserData(user);
            
            return { success: true, user: user };
            
        } catch (error) {
            console.error('Sign-in error:', error);
            this.showError('Failed to sign in. Please try again.');
            return { success: false, error: error.message };
        } finally {
            this.showLoading(false);
        }
    }

    // Handle user sign-out
    async signOut() {
        try {
            await auth.signOut();
            console.log('User signed out');
            return { success: true };
        } catch (error) {
            console.error('Sign-out error:', error);
            return { success: false, error: error.message };
        }
    }

    // Save user data to Firestore
    async saveUserData(user) {
        try {
            const userRef = db.collection('users').doc(user.uid);
            
            // Check if user document exists
            const userDoc = await userRef.get();
            
            if (!userDoc.exists) {
                // New user - create profile
                await userRef.set({
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                    totalSessions: 0,
                    preferences: {
                        emailNotifications: true,
                        autoSave: true
                    }
                });
                console.log('New user profile created');
            } else {
                // Existing user - update last login
                await userRef.update({
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log('User login updated');
            }
        } catch (error) {
            console.error('Error saving user data:', error);
        }
    }

    // Get current user ID
    getCurrentUID() {
        return this.currentUser ? this.currentUser.uid : null;
    }

    // Check if user is signed in
    isSignedIn() {
        return this.currentUser !== null;
    }

    // Get user display name
    getUserDisplayName() {
        return this.currentUser ? this.currentUser.displayName : 'User';
    }

    // Event handlers (override these in your main app)
    onUserSignedIn(user) {
        // Will be overridden by main app
        console.log('User signed in event:', user.displayName);
    }

    onUserSignedOut() {
        // Will be overridden by main app
        console.log('User signed out event');
    }

    // UI helpers
    showLoading(show) {
        const loadingElement = document.getElementById('auth-loading');
        if (loadingElement) {
            loadingElement.style.display = show ? 'block' : 'none';
        }
    }

    showError(message) {
        const errorElement = document.getElementById('auth-error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            
            // Hide error after 5 seconds
            setTimeout(() => {
                errorElement.style.display = 'none';
            }, 5000);
        }
    }
}

// Create global auth manager instance
const authManager = new AuthManager();