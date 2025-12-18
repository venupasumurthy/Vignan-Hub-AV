
// Mock VignanHub SDK Client using localStorage
// This replaces the actual SDK to allow the app to run standalone.

const STORAGE_PREFIX = 'vignan_mock_';
const AUTH_KEY = 'vignan_auth_user';
const USERS_KEY = 'vignan_users'; // New key for persisting registered users

// Helper to simulate async delay
const delay = (ms = 50) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to get all registered users
const getRegisteredUsers = () => {
  const users = localStorage.getItem(USERS_KEY);
  return users ? JSON.parse(users) : [];
};

// Mock Auth Service
const auth = {
  isAuthenticated: async () => {
    await delay();
    return !!localStorage.getItem(AUTH_KEY);
  },
  me: async () => {
    await delay();
    const user = localStorage.getItem(AUTH_KEY);
    return user ? JSON.parse(user) : null;
  },
  login: async (email, password) => {
    await delay();

    // 1. Check registered users first
    const registeredUsers = getRegisteredUsers();
    const foundUser = registeredUsers.find(u => u.email === email);

    if (foundUser) {
      // 1.1 Strict Password Check
      if (foundUser.password !== password) {
        throw new Error("Invalid password");
      }
      localStorage.setItem(AUTH_KEY, JSON.stringify(foundUser));
      return foundUser;
    }

    // 2. specific demo accounts (fallback)
    if (email === "teacher@vignanhub.com") {
      // For demo accounts, we can opt to check a hardcoded password or allow any. 
      // User request implies strict checking for *signup* flow primarily.
      // Let's assume demo accounts are "legacy" and still work easily for testing.
      const user = {
        id: 'demo-teacher-456',
        email: email,
        full_name: 'Demo Teacher',
        account_type: 'teacher',
        avatar: 'https://ui-avatars.com/api/?name=Demo+Teacher',
        points: 0,
        badges: [],
        created_date: new Date().toISOString()
      };
      localStorage.setItem(AUTH_KEY, JSON.stringify(user));
      return user;
    }

    if (email === "student@vignanhub.com") {
      const user = {
        id: 'demo-user-123',
        email: email || 'student@example.com',
        full_name: 'Demo Student',
        account_type: 'student',
        avatar: 'https://ui-avatars.com/api/?name=Demo+Student',
        points: 150,
        badges: ['First Login', 'Fast Learner'],
        enrolled_courses: ['course-1', 'course-2'],
        created_date: new Date().toISOString()
      };
      localStorage.setItem(AUTH_KEY, JSON.stringify(user));
      return user;
    }

    throw new Error("Invalid email or password");
  },
  signup: async (email, password, fullName, accountType) => {
    await delay();

    // Check if user already exists
    const registeredUsers = getRegisteredUsers();
    if (registeredUsers.some(u => u.email === email)) {
      throw new Error("User with this email already exists.");
    }

    const user = {
      id: 'user-' + Math.random().toString(36).substr(2, 9),
      email: email,
      password: password, // Store password
      full_name: fullName,
      account_type: accountType || 'student',
      avatar: `https://ui-avatars.com/api/?name=${fullName}`,
      points: 0,
      badges: [],
      created_date: new Date().toISOString(),
      onboarding_completed: true
    };

    // Save to persistent storage
    registeredUsers.push(user);
    localStorage.setItem(USERS_KEY, JSON.stringify(registeredUsers));

    // Log the user in (set session)
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    return user;
  },
  resetPassword: async (email, newPassword) => {
    await delay();

    // Check registered users
    const registeredUsers = getRegisteredUsers();
    const userIndex = registeredUsers.findIndex(u => u.email === email);

    if (userIndex === -1) {
      // Also allow demo accounts to "reset" (simulated success)
      if (email === "teacher@vignanhub.com" || email === "student@vignanhub.com") {
        return true;
      }
      throw new Error("No account found with this email.");
    }

    // Update password
    registeredUsers[userIndex].password = newPassword;
    localStorage.setItem(USERS_KEY, JSON.stringify(registeredUsers));

    // If this user is currently logged in locally, update their session too (optional, but good for consistency)
    const currentUser = localStorage.getItem(AUTH_KEY);
    if (currentUser) {
      const parsed = JSON.parse(currentUser);
      if (parsed.email === email) {
        parsed.password = newPassword;
        localStorage.setItem(AUTH_KEY, JSON.stringify(parsed));
      }
    }

    return true;
  },
  logout: async () => {
    await delay();
    localStorage.removeItem(AUTH_KEY);
  },
  redirectToLogin: () => {
    // Basic redirect simulation
    window.location.href = '/Login';
  },
  updateMe: async (updates) => {
    await delay();
    const userStr = localStorage.getItem(AUTH_KEY);
    if (!userStr) throw new Error("Not authenticated");
    const user = JSON.parse(userStr);
    const updatedUser = { ...user, ...updates };
    localStorage.setItem(AUTH_KEY, JSON.stringify(updatedUser));
    return updatedUser;
  }
};

// Generic Mock Entity Service
class MockEntityService {
  constructor(entityName) {
    this.entityName = entityName;
    this.storageKey = `${STORAGE_PREFIX}${entityName}`;
  }

  _getAll() {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }

  _saveAll(items) {
    localStorage.setItem(this.storageKey, JSON.stringify(items));
  }

  async list(sort = null, limit = null) {
    await delay();
    let items = this._getAll();

    // Basic sorting (only supports -field for desc, field for asc)
    if (sort) {
      const desc = sort.startsWith('-');
      const field = desc ? sort.substring(1) : sort;
      items.sort((a, b) => {
        if (a[field] < b[field]) return desc ? 1 : -1;
        if (a[field] > b[field]) return desc ? -1 : 1;
        return 0;
      });
    }

    if (limit) {
      items = items.slice(0, limit);
    }

    return items;
  }

  async filter(query, sort = null, limit = null) {
    await delay();
    let items = this._getAll();

    // Basic filtering
    items = items.filter(item => {
      for (const key in query) {
        if (item[key] !== query[key]) return false;
      }
      return true;
    });

    // Reuse list logic for sort/limit (duplication for simplicity in mock)
    if (sort) {
      const desc = sort.startsWith('-');
      const field = desc ? sort.substring(1) : sort;
      items.sort((a, b) => {
        if (a[field] < b[field]) return desc ? 1 : -1;
        if (a[field] > b[field]) return desc ? -1 : 1;
        return 0;
      });
    }

    if (limit) {
      items = items.slice(0, limit);
    }

    return items;
  }

  async get(id) {
    await delay();
    const items = this._getAll();
    return items.find(i => i.id === id) || null;
  }

  async create(data) {
    await delay();
    const items = this._getAll();
    const newItem = {
      id: Math.random().toString(36).substr(2, 9),
      created_date: new Date().toISOString(),
      ...data
    };
    items.push(newItem);
    this._saveAll(items);
    return newItem;
  }

  async update(id, updates) {
    await delay();
    const items = this._getAll();
    const index = items.findIndex(i => i.id === id);
    if (index === -1) throw new Error("Item not found");

    items[index] = { ...items[index], ...updates };
    this._saveAll(items);
    return items[index];
  }

  async delete(id) {
    await delay();
    let items = this._getAll();
    items = items.filter(i => i.id !== id);
    this._saveAll(items);
    return true;
  }
}

// Pre-define entities used in the app
const entities = {
  Course: new MockEntityService('Course'),
  Assignment: new MockEntityService('Assignment'),
  Submission: new MockEntityService('Submission'),
  Roadmap: new MockEntityService('Roadmap'),
  Badge: new MockEntityService('Badge'),
  Circular: new MockEntityService('Circular'),
  Notification: new MockEntityService('Notification'),
  CourseMaterial: new MockEntityService('CourseMaterial'),
  Discussion: new MockEntityService('Discussion'),
  Quiz: new MockEntityService('Quiz'),
  QuizAttempt: new MockEntityService('QuizAttempt'),
  StudentRemark: new MockEntityService('StudentRemark'),
  Feedback: new MockEntityService('Feedback'),
  CourseResource: new MockEntityService('CourseResource')
};

// Seed initial data if empty
const seedData = () => {
  if (!localStorage.getItem(`${STORAGE_PREFIX}Course`)) {
    console.log("Seeding initial data...");
    // Seed Courses
    const courses = [
      { id: 'course-1', title: 'Introduction to React', description: 'Learn the basics of React', teacher_id: 'demo-teacher-456', teacher_name: 'Demo Teacher', thumbnail_color: 'linear-gradient(135deg, #667eea, #764ba2)', created_date: new Date().toISOString() },
      { id: 'course-2', title: 'Advanced JavaScript', description: 'Deep dive into JS', teacher_id: 'demo-teacher-456', teacher_name: 'Demo Teacher', thumbnail_color: 'linear-gradient(135deg, #f093fb, #f5576c)', created_date: new Date().toISOString() },
      { id: 'course-3', title: 'Web Design Fundamentals', description: 'UI/UX Principles', teacher_id: 'other-teacher', teacher_name: 'Jane Doe', thumbnail_color: 'linear-gradient(135deg, #43e97b, #38f9d7)', created_date: new Date().toISOString() }
    ];
    localStorage.setItem(`${STORAGE_PREFIX}Course`, JSON.stringify(courses));

    // Seed Circulars
    const circulars = [
      { id: 'circ-1', title: 'Exam Schedule', content: 'Mid-term exams start next week.', created_date: new Date().toISOString() },
      { id: 'circ-2', title: 'Holiday Announcement', content: 'School is closed on Friday.', created_date: new Date().toISOString() }
    ];
    localStorage.setItem(`${STORAGE_PREFIX}Circular`, JSON.stringify(circulars));

    // Seed Badges
    localStorage.setItem(`${STORAGE_PREFIX}Badge`, JSON.stringify([]));
  }
};

// Run seed on load
if (typeof window !== 'undefined') {
  seedData();
}


export const createClient = (config) => {
  return {
    auth,
    entities
  };
};

// Export a singleton instance similar to how the app uses it
export const vignan = createClient({});
