

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Home, BookOpen, FileText, Award, TrendingUp, 
  Map, Bell, LogOut, Menu, X, Users, Megaphone, Settings
} from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [user, setUser] = React.useState(null);
  const [notifications, setNotifications] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const location = useLocation();

  React.useEffect(() => {
    loadUser();
    loadNotifications();
  }, []);

  const loadUser = async () => {
    try {
      // Check if user is authenticated first
      const isAuthenticated = await base44.auth.isAuthenticated();
      
      if (!isAuthenticated) {
        // Redirect to login if not authenticated
        base44.auth.redirectToLogin();
        return;
      }

      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      // Check if user needs to complete onboarding
      if (!currentUser.onboarding_completed && currentPageName !== 'Onboarding') {
        window.location.href = createPageUrl('Onboarding');
        return;
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error loading user:", error);
      // If there's an error getting user, redirect to login
      base44.auth.redirectToLogin();
    }
  };

  const loadNotifications = async () => {
    try {
      const isAuthenticated = await base44.auth.isAuthenticated();
      if (!isAuthenticated) return;

      const currentUser = await base44.auth.me();
      const notifs = await base44.entities.Notification.filter(
        { user_id: currentUser.id, read: false },
        '-created_date',
        5
      );
      setNotifications(notifs);
    } catch (error) {
      console.error("Error loading notifications:", error);
    }
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  // Don't show layout on onboarding page
  if (currentPageName === 'Onboarding') {
    return children;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{
        background: 'linear-gradient(135deg, #E8DEFF 0%, #D4E8FF 50%, #D4F4DD 100%)'
      }}>
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-600" />
      </div>
    );
  }

  const navigation = [
    { name: "Dashboard", path: "Dashboard", icon: Home, roles: ["admin", "user"] },
    { name: "Courses", path: "Courses", icon: BookOpen, roles: ["admin", "user"] },
    { name: "Assignments", path: "Assignments", icon: FileText, roles: ["admin", "user"] },
    { name: "Grades", path: "Grades", icon: TrendingUp, roles: ["admin", "user"] },
    { name: "Roadmaps", path: "Roadmaps", icon: Map, roles: ["admin", "user"] },
    { name: "Badges", path: "Badges", icon: Award, roles: ["admin", "user"] },
    { name: "Circulars", path: "Circulars", icon: Megaphone, roles: ["admin", "user"] },
    { name: "Leaderboard", path: "Leaderboard", icon: Users, roles: ["admin", "user"] },
    { name: "Settings", path: "Settings", icon: Settings, roles: ["admin", "user"] },
  ];

  const filteredNav = navigation.filter(item => 
    !item.roles || item.roles.includes(user?.role)
  );

  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(135deg, #E8DEFF 0%, #D4E8FF 50%, #D4F4DD 100%)'
    }}>
      <style>{`
        .clay-card {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          box-shadow: 
            8px 8px 20px rgba(0, 0, 0, 0.08),
            -8px -8px 20px rgba(255, 255, 255, 0.9),
            inset 2px 2px 8px rgba(255, 255, 255, 0.5),
            inset -2px -2px 8px rgba(0, 0, 0, 0.05);
          transition: all 0.3s ease;
        }
        
        .clay-card:hover {
          transform: translateY(-2px);
          box-shadow: 
            10px 10px 25px rgba(0, 0, 0, 0.1),
            -10px -10px 25px rgba(255, 255, 255, 1),
            inset 2px 2px 8px rgba(255, 255, 255, 0.5),
            inset -2px -2px 8px rgba(0, 0, 0, 0.05);
        }

        .clay-button {
          background: rgba(255, 255, 255, 0.8);
          border-radius: 16px;
          box-shadow: 
            4px 4px 12px rgba(0, 0, 0, 0.08),
            -4px -4px 12px rgba(255, 255, 255, 0.9),
            inset 1px 1px 4px rgba(255, 255, 255, 0.5);
          transition: all 0.3s ease;
          border: none;
        }

        .clay-button:hover {
          box-shadow: 
            2px 2px 8px rgba(0, 0, 0, 0.1),
            -2px -2px 8px rgba(255, 255, 255, 1),
            inset 2px 2px 6px rgba(0, 0, 0, 0.05);
        }

        .clay-button:active {
          box-shadow: 
            inset 4px 4px 12px rgba(0, 0, 0, 0.1),
            inset -2px -2px 8px rgba(255, 255, 255, 0.5);
        }

        .clay-input {
          background: rgba(255, 255, 255, 0.6);
          border-radius: 16px;
          box-shadow: 
            inset 3px 3px 8px rgba(0, 0, 0, 0.06),
            inset -2px -2px 6px rgba(255, 255, 255, 0.8);
          border: none;
          padding: 12px 16px;
          transition: all 0.3s ease;
        }

        .clay-input:focus {
          outline: none;
          box-shadow: 
            inset 4px 4px 10px rgba(0, 0, 0, 0.08),
            inset -2px -2px 8px rgba(255, 255, 255, 0.9);
        }

        .nav-item-active {
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 
            inset 3px 3px 8px rgba(0, 0, 0, 0.08),
            inset -2px -2px 6px rgba(255, 255, 255, 0.8);
        }
      `}</style>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 clay-card m-4">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full" style={{
              background: 'linear-gradient(135deg, #E8DEFF, #D4E8FF)',
              boxShadow: 'inset 2px 2px 4px rgba(255,255,255,0.8), inset -2px -2px 4px rgba(0,0,0,0.1)'
            }} />
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Vignan Hub
            </h1>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="clay-button p-2"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="h-full clay-card m-4 p-6 flex flex-col">
          {/* Logo */}
          <div className="hidden lg:flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-full" style={{
              background: 'linear-gradient(135deg, #E8DEFF, #D4E8FF)',
              boxShadow: 'inset 2px 2px 4px rgba(255,255,255,0.8), inset -2px -2px 4px rgba(0,0,0,0.1)'
            }} />
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Vignan Hub
              </h1>
              <p className="text-xs text-gray-500">Learning Platform</p>
            </div>
          </div>

          {/* User Info */}
          {user && (
            <div className="clay-card p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{
                  background: 'linear-gradient(135deg, #667eea, #764ba2)'
                }}>
                  {user.full_name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{user.full_name}</p>
                  <p className="text-xs text-gray-500 capitalize">
                    {user.account_type === 'teacher' ? 'Teacher' : 'Student'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 space-y-2 overflow-y-auto">
            {filteredNav.map((item) => {
              const isActive = location.pathname === createPageUrl(item.path);
              return (
                <Link
                  key={item.path}
                  to={createPageUrl(item.path)}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
                    isActive ? 'nav-item-active' : 'hover:bg-white/40'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-purple-600' : 'text-gray-600'}`} />
                  <span className={`font-medium ${isActive ? 'text-purple-600' : 'text-gray-700'}`}>
                    {item.name}
                  </span>
                  {item.path === "Dashboard" && notifications.length > 0 && (
                    <span className="ml-auto w-5 h-5 rounded-full bg-gradient-to-r from-pink-400 to-red-400 text-white text-xs flex items-center justify-center">
                      {notifications.length}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="clay-button w-full flex items-center justify-center gap-2 px-4 py-3 text-red-600 font-medium mt-4"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:ml-72 pt-20 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

