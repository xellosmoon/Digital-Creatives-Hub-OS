import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Bell, Shield, ArrowLeft } from 'lucide-react';
import { Session } from '@supabase/supabase-js';
import NotificationPreferences from '../components/settings/NotificationPreferences';
import ProfileSettings from '../components/settings/ProfileSettings';
import SecuritySettings from '../components/settings/SecuritySettings';

interface SettingsProps {
  session: Session;
}

export default function Settings({ session }: SettingsProps): JSX.Element {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'security'>('profile');

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Security', icon: Shield }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-4"
        >
          <ArrowLeft className="h-5 w-5 mr-1" />
          Back
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Manage your account preferences</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-slate-700 mb-8">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'profile' | 'notifications' | 'security')}
                className={`
                  group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-slate-600'
                  }
                `}
              >
                <Icon className={`
                  -ml-0.5 mr-2 h-5 w-5
                  ${activeTab === tab.id ? 'text-primary-500 dark:text-primary-400' : 'text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-400'}
                `} />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="max-w-4xl">
        {activeTab === 'profile' && (
          <ProfileSettings userId={session.user.id} />
        )}

        {activeTab === 'notifications' && (
          <NotificationPreferences userId={session.user.id} />
        )}

        {activeTab === 'security' && (
          <SecuritySettings />
        )}
      </div>
    </div>
  );
}
