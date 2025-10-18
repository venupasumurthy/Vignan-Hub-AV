<div align="center">

# 🧠 **Vignan HUB**
### _"Driven by purpose, powered by code"_

**Team Name:** 🥇 AV CodeHack  
**Contact:** ✉️ [venupasumurthy0509@gmail.com] | 📞 +91 8106938278  
**Live Project URL:** 🌐 [https://vignan-hub-av.base44.app](https://vignan-hub-av.base44.app)

![Vignan Hub Banner](https://imgur.com/EQm6vH2.png)

</div>

---

## 🏫 Overview
**Vignan HUB** is an interactive **Learning Management System (LMS)** designed to streamline online education for both **students** and **teachers**.  
The platform allows seamless course management, assignment handling, grading, and communication — providing an engaging and organized digital learning experience.

---

## 👥 Team

| Name | Role | LinkedIn |
|------|------|-----------|
| **Pasumurthy Venu Munendra Kumar** | Team Lead | [LinkedIn](https://www.linkedin.com/in/venupasumurthy/) |
| **Natesan Aishwarya** | Developer | [LinkedIn](http://www.linkedin.com/in/aishwarya-natesan-bb48a1360) |

---

## 🚀 Project Features

### 🔐 Authentication
- Secure **Sign Up / Sign In** for both students and teachers.  
- **Role-based access control (RBAC)** at login (Teacher/Student).  

---

### 👩‍🏫 Teacher Functionalities
- Create and manage **courses** (add topics, upload materials).  
- Upload **assignments** with submission deadlines.  
- **Evaluate** submissions and assign grades.  
- Award **badges & points** for student performance.  
- Design **roadmaps** for guided learning journeys.  
- Post **announcements/circulars** for updates.  
- View **leaderboard** of top-performing teachers.  

---

### 👨‍🎓 Student Functionalities
- Browse and **enroll** in available courses.  
- Access **learning materials** and submit assignments.  
- View **grades and performance** through downloadable CSV.  
- Track **badges and points** earned through assessments.  
- Follow **teacher-created roadmaps** for structured learning.  
- Receive **notifications** for updates, new courses, or circulars.  
- Interact through the **“Have a Doubt?”** section.

---

### ✨ Additional Features
- **Grade Sheet Export (CSV)**  
- **Badges & Points System**  
- **Leaderboard for Teachers**  
- **In-App Notifications**  
- **AI-powered Roadmaps (Future Ready)**

---

## ⚙️ Working Flow

### 🧩 1️⃣ Registration & Login
- Role-based sign-up (Teacher or Student).  
- Authenticated access with Base44 Auth integration.  

### 🧭 2️⃣ Teacher Dashboard
- Manage courses, assignments, and roadmaps.  
- Evaluate students and post circulars.

### 🎓 3️⃣ Student Dashboard
- View enrolled courses, grades, and badges.  
- Submit work and track progress.

---

## 🧰 Tech Stack

| Layer | Technologies |
|--------|---------------|
| **Frontend** | React.js, Tailwind CSS |
| **Backend** | Node.js, Express.js |
| **Database** | Versal |
| **Authentication** | Base44 Auth |
| **Storage** | Cloud Storage |
| **Version Control** | GitHub |

---

## 🧱 System Architecture

```mermaid
flowchart TD
    A[User] -->|Login/Signup| B[Base44 Auth Service]
    B --> C{Role Check}
    C -->|Teacher| D[Teacher Dashboard]
    C -->|Student| E[Student Dashboard]
    D --> F[Course Management Service]
    D --> G[Assignment Service]
    D --> H[Gradebook & Badge System]
    E --> I[Course Enrollment Service]
    E --> J[Submission Handler]
    H --> K[Database (Versal)]
    I --> K
    J --> K
    F --> K
    G --> K
