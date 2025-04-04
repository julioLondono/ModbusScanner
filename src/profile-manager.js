const { app } = require('electron');
const path = require('path');
const fs = require('fs');

class ProfileManager {
    constructor() {
        // Get user data path for storing profiles
        const userDataPath = app.getPath('userData');
        this.profilesPath = path.join(userDataPath, 'connection-profiles.json');
        this.ensureProfileFile();
    }

    ensureProfileFile() {
        if (!fs.existsSync(this.profilesPath)) {
            fs.writeFileSync(this.profilesPath, JSON.stringify([], null, 2));
        }
    }

    async loadProfiles() {
        try {
            const data = await fs.promises.readFile(this.profilesPath, 'utf8');
            return {
                success: true,
                data: JSON.parse(data),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error loading profiles:', error);
            return {
                success: false,
                error: {
                    type: 'Profile Error',
                    message: 'Failed to load profiles',
                    details: error.message,
                    suggestions: ['Check if profiles file exists', 'Verify file permissions']
                },
                timestamp: new Date().toISOString()
            };
        }
    }

    async saveProfile(profile) {
        try {
            const loadResult = await this.loadProfiles();
            if (!loadResult.success) {
                return loadResult;
            }
            
            const profiles = loadResult.data;
            const existingIndex = profiles.findIndex(p => p.name === profile.name);
            
            if (existingIndex >= 0) {
                profiles[existingIndex] = profile;
            } else {
                profiles.push(profile);
            }

            await fs.promises.writeFile(this.profilesPath, JSON.stringify(profiles, null, 2));
            return {
                success: true,
                message: `Profile '${profile.name}' saved successfully`,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error saving profile:', error);
            return {
                success: false,
                error: {
                    type: 'Profile Error',
                    message: 'Failed to save profile',
                    details: error.message,
                    suggestions: ['Check write permissions', 'Verify profile data is valid']
                },
                timestamp: new Date().toISOString()
            };
        }
    }

    async deleteProfile(profileName) {
        try {
            const loadResult = await this.loadProfiles();
            if (!loadResult.success) {
                return loadResult;
            }

            const profiles = loadResult.data;
            const filteredProfiles = profiles.filter(p => p.name !== profileName);
            
            if (filteredProfiles.length === profiles.length) {
                return {
                    success: false,
                    error: {
                        type: 'Profile Error',
                        message: 'Profile not found',
                        details: `Profile '${profileName}' does not exist`,
                        suggestions: ['Select an existing profile', 'Refresh the profile list']
                    },
                    timestamp: new Date().toISOString()
                };
            }

            await fs.promises.writeFile(this.profilesPath, JSON.stringify(filteredProfiles, null, 2));
            return {
                success: true,
                message: `Profile '${profileName}' deleted successfully`,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error deleting profile:', error);
            return {
                success: false,
                error: {
                    type: 'Profile Error',
                    message: 'Failed to delete profile',
                    details: error.message,
                    suggestions: ['Check file permissions', 'Try restarting the application']
                },
                timestamp: new Date().toISOString()
            };
        }
    }
}

module.exports = ProfileManager;
