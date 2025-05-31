import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Save, Upload, User } from 'lucide-react';
import supabase from '../lib/db';

interface Profile {
  username: string | null;
  avatar_url: string | null;
}

function Settings() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (session?.user?.id) {
      setEmail(session.user.email || '');
      loadProfile();
    }
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') setDarkMode(true);
  }, [session?.user?.id]);

  const loadProfile = async () => {
    if (!session?.user?.id) return;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', session.user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!profile) {
        // Profile doesn't exist, create one
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert([
            {
              id: session.user.id,
              username: null,
              avatar_url: null
            }
          ])
          .select('username, avatar_url')
          .single();

        if (insertError) throw insertError;
        
        setUsername('');
        setAvatarUrl('');
      } else {
        setUsername(profile.username || '');
        setAvatarUrl(profile.avatar_url || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setMessage({
        type: 'error',
        text: 'Failed to load profile. Please try again.'
      });
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatarFile(e.target.files[0]);
    }
  };

  const uploadAvatar = async () => {
    if (!avatarFile || !session?.user) return null;

    const fileExt = avatarFile.name.split('.').pop();
    const fileName = `${session.user.id}-${Math.random()}.${fileExt}`;

    const { error: uploadError, data } = await supabase.storage
      .from('avatars')
      .upload(fileName, avatarFile);

    if (uploadError) {
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      if (!session?.user) throw new Error('No user session found');

      let updates: { email?: string; password?: string } = {};
      let profileUpdates: Partial<Profile> = {};

      if (avatarFile) {
        const newAvatarUrl = await uploadAvatar();
        if (newAvatarUrl) {
          profileUpdates.avatar_url = newAvatarUrl;
        }
      }

      if (username) {
        profileUpdates.username = username;
      }

      if (Object.keys(profileUpdates).length > 0) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({ 
            id: session.user.id,
            ...profileUpdates,
            updated_at: new Date().toISOString()
          });

        if (profileError) throw profileError;
      }

      if (password) {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        updates.password = password;
      }

      if (email !== session.user.email) {
        updates.email = email;
      }

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase.auth.updateUser(updates);
        if (updateError) throw updateError;
      }

      setMessage({ type: 'success', text: 'Settings updated successfully' });
      setPassword('');
      setConfirmPassword('');
      setAvatarFile(null);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`min-h-screen ${
        darkMode ? 'bg-keystone-black text-white' : 'bg-gray-50 text-gray-900'
      }`}
    >
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => navigate('/chat')}
            className="flex items-center gap-2 text-keystone-red hover:text-red-700"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Chat
          </button>
          <h1 className="text-2xl font-bold">Account Settings</h1>
        </div>

        {message.text && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-500/10 border border-green-500/20 text-green-500'
                : 'bg-red-500/10 border border-red-500/20 text-red-500'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className={`w-24 h-24 rounded-full overflow-hidden border-2 ${
                darkMode ? 'border-keystone-gray-light' : 'border-gray-200'
              }`}>
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${
                    darkMode ? 'bg-keystone-gray-dark' : 'bg-gray-100'
                  }`}>
                    <User className="w-12 h-12 text-gray-400" />
                  </div>
                )}
              </div>
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 p-1 rounded-full bg-keystone-red hover:bg-red-700 cursor-pointer"
              >
                <Upload className="w-4 h-4 text-white" />
                <input
                  type="file"
                  id="avatar-upload"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            </div>
            <div>
              <h3 className="font-medium mb-1">Profile Picture</h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Upload a new avatar or change your profile picture
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-medium mb-2">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border ${
                darkMode
                  ? 'bg-keystone-gray-dark border-keystone-gray-light text-white'
                  : 'bg-white border-gray-200'
              } focus:outline-none focus:ring-2 focus:ring-keystone-red`}
              placeholder="Choose a username"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border ${
                darkMode
                  ? 'bg-keystone-gray-dark border-keystone-gray-light text-white'
                  : 'bg-white border-gray-200'
              } focus:outline-none focus:ring-2 focus:ring-keystone-red`}
            />
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                New Password (leave blank to keep current)
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-4 py-2 rounded-lg border ${
                  darkMode
                    ? 'bg-keystone-gray-dark border-keystone-gray-light text-white'
                    : 'bg-white border-gray-200'
                } focus:outline-none focus:ring-2 focus:ring-keystone-red`}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-4 py-2 rounded-lg border ${
                  darkMode
                    ? 'bg-keystone-gray-dark border-keystone-gray-light text-white'
                    : 'bg-white border-gray-200'
                } focus:outline-none focus:ring-2 focus:ring-keystone-red`}
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg bg-keystone-red text-white ${
                isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-700'
              }`}
            >
              <Save className="w-5 h-5" />
              Save Changes
            </motion.button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}

export default Settings;