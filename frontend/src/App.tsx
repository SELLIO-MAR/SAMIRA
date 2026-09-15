import { Routes, Route } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import SchoolConfigPage from "./pages/SchoolConfigPage";
import ClassesPage from "./pages/ClassesPage";
import SubjectsPage from "./pages/SubjectsPage";
import TeachersPage from "./pages/TeachersPage";
import GeneratePage from "./pages/GeneratePage";
import ClassTimetablePage from "./pages/ClassTimetablePage";
import TeacherTimetablePage from "./pages/TeacherTimetablePage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/etablissement" element={<SchoolConfigPage />} />
      <Route path="/classes" element={<ClassesPage />} />
      <Route path="/matieres" element={<SubjectsPage />} />
      <Route path="/professeurs" element={<TeachersPage />} />
      <Route path="/generation" element={<GeneratePage />} />
      <Route path="/emplois-classes" element={<ClassTimetablePage />} />
      <Route path="/emplois-professeurs" element={<TeacherTimetablePage />} />
    </Routes>
  );
}
