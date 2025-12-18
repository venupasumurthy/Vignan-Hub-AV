
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Home, BookOpen, FileText, Award, TrendingUp,
  Map, Bell, LogOut, Menu, X, Users, Megaphone, Settings, FileQuestion, MessageSquare, Play
} from "lucide-react";
import { vignan } from "@/api/vignanClient";


export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [user, setUser] = React.useState(null);
  const [notifications, setNotifications] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const location = useLocation();

  React.useEffect(() => {
    if (currentPageName !== 'Login' && currentPageName !== 'Onboarding') {
      loadUser();
      loadNotifications();
    } else {
      setLoading(false);
    }
  }, [currentPageName]);

  const loadUser = async () => {
    try {
      const isAuthenticated = await vignan.auth.isAuthenticated();

      if (!isAuthenticated) {
        vignan.auth.redirectToLogin();
        return;
      }

      const currentUser = await vignan.auth.me();
      setUser(currentUser);

      if (!currentUser.onboarding_completed && currentPageName !== 'Onboarding') {
        window.location.href = createPageUrl('Onboarding');
        return;
      }

      setLoading(false);
    } catch (error) {
      console.error("Error loading user:", error);
      vignan.auth.redirectToLogin();
    }
  };

  const loadNotifications = async () => {
    try {
      const isAuthenticated = await vignan.auth.isAuthenticated();
      if (!isAuthenticated) return;

      const currentUser = await vignan.auth.me();
      const notifs = await vignan.entities.Notification.filter(
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
    vignan.auth.logout();
    window.location.href = createPageUrl('Login');
  };

  if (currentPageName === 'Onboarding' || currentPageName === 'Login') {
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
    { name: "Dashboard", path: "Dashboard", icon: Home, roles: ["student", "teacher"] },
    { name: "Courses", path: "Courses", icon: BookOpen, roles: ["student", "teacher"] },
    { name: "Live Classes", path: "CourseResources", icon: Play, roles: ["student", "teacher"] },
    { name: "Assignments", path: "Assignments", icon: FileText, roles: ["student", "teacher"] },
    { name: "Quizzes", path: "Quizzes", icon: FileQuestion, roles: ["student", "teacher"] },
    { name: "Roadmaps", path: "Roadmaps", icon: Map, roles: ["student", "teacher"] },
    { name: "Analytics", path: "Analytics", icon: TrendingUp, roles: ["student"] },
    { name: "Grades", path: "Grades", icon: Award, roles: ["student", "teacher"] },
    { name: "Badges", path: "Badges", icon: Award, roles: ["student", "teacher"] },
    { name: "Leaderboard", path: "Leaderboard", icon: Users, roles: ["student", "teacher"] },

    { name: "Feedbacks", path: "Feedbacks", icon: MessageSquare, roles: ["student", "teacher"] },
    { name: "Settings", path: "Settings", icon: Settings, roles: ["student", "teacher"] },
  ];

  const filteredNav = navigation.filter(item =>
    !item.roles || item.roles.includes(user?.account_type)
  );

  return (
    <div className="min-h-screen" style={{
      background: '#f8fafc' // Slate-50, clean single tone background
    }}>
      <style>{`
        .clay-card {
        background: #ffffff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
      transition: all 0.2s ease;
        }

      .clay-card:hover {
        transform: translateY(-2px);
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025);
        }

      .clay-button {
        background: #f1f5f9; /* Slate-100 for better visibility */
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      transition: all 0.2s ease;
      color: #0f172a;
      font-weight: 500;
        }

      .clay-button:hover {
        background: #e2e8f0; /* Slate-200 */
      color: #0f172a;
      border-color: #cbd5e1;
        }

      .clay-button:active {
        transform: scale(0.98);
        }

      .clay-button-primary {
        background: #2563eb; /* Blue 600 - Primary/Trust */
        color: white !important;
        font-weight: 600;
        transition: all 0.2s;
        }

      .clay-button-primary:hover {
        background: #1d4ed8; /* Blue 700 */
        box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.3);
        }

      .clay-button-success {
        background: #10b981;
      color: white !important;
      font-weight: 600;
        }

      .clay-button-danger {
        background: #ef4444;
      color: white !important;
      font-weight: 600;
        }

      .clay-input {
        background: #f8fafc;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      padding: 12px 16px;
      transition: all 0.2s ease;
      color: #0f172a;
        }

      .clay-input:focus {
        outline: none;
      border-color: #2563eb;
      ring: 2px solid #2563eb;
        }

      .nav-item-active {
        background: #2563eb; /* Blue 600 */
      color: white !important;
      box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.3);
        }
      .nav-item-active svg {
        color: white !important;
        }
      .nav-item-active span {
        color: white !important;
        }
      `}</style>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 m-0">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10">
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain rounded-full" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              Vignan Hub
            </h1>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
        <div className="h-full clay-card m-4 p-6 flex flex-col">
          {/* Logo */}
          <div className="hidden lg:flex items-center gap-3 mb-8">
            <div className="w-12 h-12">
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain rounded-full shadow-lg shadow-blue-200" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Vignan Hub
              </h1>
              <p className="text-xs text-slate-500">Learning Platform</p>
            </div>
          </div>

          {/* User Info - Shows Updated Name */}
          {user && (
            <div className="clay-card p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg bg-slate-900">
                  {user.full_name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 truncate" title={user.full_name}>
                    {user.full_name}
                  </p>
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
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${isActive ? 'nav-item-active' : 'hover:bg-white/40'
                    }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span className={`font-medium ${isActive ? 'text-white' : 'text-slate-600'}`}>
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
            className="clay-button clay-button-danger w-full flex items-center justify-center gap-2 px-4 py-3 font-medium mt-4"
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
      {
        sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )
      }
    </div >
  );
}
