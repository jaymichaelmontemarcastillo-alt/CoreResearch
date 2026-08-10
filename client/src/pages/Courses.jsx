import React, { useState, useEffect } from "react";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { DataTable, TableRow, TableCell } from "../components/ui/DataTable";
import { PageHeader } from "../components/ui/PageHeader";
import { Toast } from "../components/ui/Toast";
import { BookOpen, Plus, Trash2, Edit2, RefreshCw, List } from "lucide-react";
import { Link } from "react-router-dom";
import { courseService } from "../services/course.service";

export const Courses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVariant, setToastVariant] = useState("success");
  
  // Form state
  const [isAdding, setIsAdding] = useState(false);
  const [newCourse, setNewCourse] = useState({
    code: "",
    name: "",
    departmentId: "cs",
    active: true
  });
  const [saving, setSaving] = useState(false);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const data = await courseService.getAllCourses();
      setCourses(data);
    } catch (error) {
      console.error("[Courses] fetch courses error:", error);
      showToast("Failed to load courses.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const showToast = (msg, variant = "success") => {
    setToastMessage(msg);
    setToastVariant(variant);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!newCourse.code || !newCourse.name) return;
    
    setSaving(true);
    try {
      await courseService.createCourse(newCourse);
      showToast("Course added successfully.");
      setNewCourse({ code: "", name: "", departmentId: "cs", active: true });
      setIsAdding(false);
      fetchCourses();
    } catch (error) {
      showToast(error.message || "Failed to add course", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (course) => {
    try {
      await courseService.updateCourse(course.id, { active: !course.active });
      showToast(`Course ${course.code} is now ${!course.active ? 'Active' : 'Inactive'}`);
      fetchCourses();
    } catch (error) {
      showToast("Failed to update course status.", "error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this course?")) return;
    try {
      await courseService.deleteCourse(id);
      showToast("Course deleted.");
      fetchCourses();
    } catch (error) {
      showToast("Failed to delete course.", "error");
    }
  };

  const columns = [
    { label: "Code" },
    { label: "Course Name" },
    { label: "Department" },
    { label: "Status" },
    { label: "Actions", className: "text-right" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BookOpen}
        title="Course Management"
        description="Manage the academic hierarchy and degree programs offered."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchCourses} isLoading={loading}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
            </Button>
            <Button variant="primary" size="sm" onClick={() => setIsAdding(!isAdding)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Course
            </Button>
          </div>
        }
      />

      {toastMessage && (
        <Toast message={toastMessage} variant={toastVariant} onClose={() => setToastMessage("")} />
      )}

      {isAdding && (
        <Card className="p-4 bg-gray-50 dark:bg-slate-800/50">
          <h3 className="text-sm font-semibold mb-3">Add New Course</h3>
          <form onSubmit={handleAddSubmit} className="flex flex-col md:flex-row gap-3 items-end">
            <div className="w-full md:w-32">
              <label className="block text-xs font-medium text-gray-500 mb-1">Code</label>
              <Input
                placeholder="e.g. BSCS"
                value={newCourse.code}
                onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                required
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-xs font-medium text-gray-500 mb-1">Course Name</label>
              <Input
                placeholder="Bachelor of Science in..."
                value={newCourse.name}
                onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                required
              />
            </div>
            <div className="w-full md:w-48">
              <label className="block text-xs font-medium text-gray-500 mb-1">Department</label>
              <select
                className="w-full h-10 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm px-3"
                value={newCourse.departmentId}
                onChange={(e) => setNewCourse({ ...newCourse, departmentId: e.target.value })}
              >
                <option value="cs">Computer Science</option>
                <option value="it">Information Technology</option>
                <option value="is">Information Systems</option>
                <option value="cpe">Computer Engineering</option>
              </select>
            </div>
            <div className="flex gap-2 w-full md:w-auto mt-3 md:mt-0">
              <Button type="button" variant="outline" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={saving}>
                Save
              </Button>
            </div>
          </form>
        </Card>
      )}

      <DataTable columns={columns}>
        {loading ? (
          <TableRow>
            <TableCell colSpan={5} className="py-8 text-center text-gray-400">
              Loading courses...
            </TableCell>
          </TableRow>
        ) : courses.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="py-8 text-center text-gray-400">
              No courses found.
            </TableCell>
          </TableRow>
        ) : (
          courses.map((course) => (
            <TableRow key={course.id}>
              <TableCell className="font-semibold text-gray-900 dark:text-white">
                {course.code}
              </TableCell>
              <TableCell className="font-medium text-gray-700 dark:text-gray-300">
                {course.name}
              </TableCell>
              <TableCell className="text-gray-500 dark:text-gray-400">
                <Badge variant="blue">{course.departmentId.toUpperCase()}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={course.active ? "emerald" : "gray"}>
                  {course.active ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Link to={`/admin/courses/${course.id}/sections`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      title="View Sections"
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleToggleActive(course)}
                    title="Toggle Status"
                  >
                    <Edit2 className="w-4 h-4 text-gray-500" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => handleDelete(course.id)}
                    title="Delete Course"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </DataTable>
    </div>
  );
};

export default Courses;
