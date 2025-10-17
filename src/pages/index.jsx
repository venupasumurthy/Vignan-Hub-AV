import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import Courses from "./Courses";

import Assignments from "./Assignments";

import Grades from "./Grades";

import Roadmaps from "./Roadmaps";

import Badges from "./Badges";

import Circulars from "./Circulars";

import Leaderboard from "./Leaderboard";

import Onboarding from "./Onboarding";

import Settings from "./Settings";

import CourseDetail from "./CourseDetail";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Dashboard: Dashboard,
    
    Courses: Courses,
    
    Assignments: Assignments,
    
    Grades: Grades,
    
    Roadmaps: Roadmaps,
    
    Badges: Badges,
    
    Circulars: Circulars,
    
    Leaderboard: Leaderboard,
    
    Onboarding: Onboarding,
    
    Settings: Settings,
    
    CourseDetail: CourseDetail,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Dashboard />} />
                
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/Courses" element={<Courses />} />
                
                <Route path="/Assignments" element={<Assignments />} />
                
                <Route path="/Grades" element={<Grades />} />
                
                <Route path="/Roadmaps" element={<Roadmaps />} />
                
                <Route path="/Badges" element={<Badges />} />
                
                <Route path="/Circulars" element={<Circulars />} />
                
                <Route path="/Leaderboard" element={<Leaderboard />} />
                
                <Route path="/Onboarding" element={<Onboarding />} />
                
                <Route path="/Settings" element={<Settings />} />
                
                <Route path="/CourseDetail" element={<CourseDetail />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}