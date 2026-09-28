import React, { useState, useEffect } from "react";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { DataTable, TableRow, TableCell } from "../components/ui/DataTable";
import { PageHeader } from "../components/ui/PageHeader";
import { Toast } from "../components/ui/Toast";
import { Modal } from "../components/ui/Modal";
import {
  HiBookOpen,
  HiPlus,
  HiTrash,
  HiPencilSquare,
  HiArrowPath,
  HiQueueList,
} from "react-icons/hi2";
import { Link } from "react-router-dom";
import { courseService } from "../services/course.service";
import { useConfirm } from "../context/ConfirmContext";

export const Courses = () => {
  const { confirm } = useConfirm();
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

  // Edit state
  const [editingCourse, setEditingCourse] = useState(null);
  const [updating, setUpdating] = useState(false);

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

  const showToast = (message, variant = "success") => {
    setToastMessage(message);
    setToastVariant(variant);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await courseService.createCourse({
        code: newCourse.code.toUpperCase(),
        name: newCourse.name,
        departmentId: newCourse.departmentId,
        active: true
      });
      showToast("Course created successfully.");
      setIsAdding(false);
      setNewCourse({ code: "", name: "", departmentId: "cs", active: true });
      fetchCourses();
    } catch (error) {
      showToast("Failed to create course.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingCourse) return;
    setUpdating(true);
    try {
      await courseService.updateCourse(editingCourse.id, {
        code: editingCourse.code.toUpperCase(),
        name: editingCourse.name,
        departmentId: editingCourse.departmentId,
        active: editingCourse.active
      });
      showToast("Course updated successfully.");
      setEditingCourse(null);
      fetchCourses();
    } catch (error) {
      showToast("Failed to update course.", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleActive = async (course) => {
    try {
      await courseService.updateCourse(course.id, {
        active: !course.active
      });
      showToast(`Course marked as ${!course.active ? "Active" : "Inactive"}.`);
      fetchCourses();
    } catch (error) {
      showToast("Failed to update course status.", "error");
    }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: "Delete Course",
      message: "Are you sure you want to delete this course?",
      confirmText: "Delete",
      variant: "danger"
    });
    if (!isConfirmed) return;
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
        icon={HiBookOpen}
        title="Course Management"
        description="Manage the academic hierarchy and degree programs offered."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={() => setIsAdding(!isAdding)}>
              <HiPlus className="w-3.5 h-3.5 mr-1.5" /> Add Course
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
                  <Link
                    to={`/admin/courses/${course.id}/sections`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200/60 dark:border-blue-800/40 transition"
                    title="View & Manage Sections"
                  >
                    <HiQueueList className="w-3.5 h-3.5" />
                    <span>Sections</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setEditingCourse({ ...course })}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                    title="Edit Course"
                  >
                    <HiPencilSquare className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(course.id)}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                    title="Delete Course"
                  >
                    <HiTrash className="w-4 h-4" />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </DataTable>

      {/* Edit Course Modal */}
      <Modal
        isOpen={!!editingCourse}
        onClose={() => setEditingCourse(null)}
        title="Edit Course / Program"
        icon={HiBookOpen}
      >
        {editingCourse && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Course Code
              </label>
              <Input
                value={editingCourse.code}
                onChange={(e) => setEditingCourse({ ...editingCourse, code: e.target.value.toUpperCase() })}
                required
                placeholder="e.g. BSCS"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Course / Program Name
              </label>
              <Input
                value={editingCourse.name}
                onChange={(e) => setEditingCourse({ ...editingCourse, name: e.target.value })}
                required
                placeholder="e.g. Bachelor of Science in Computer Science"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Department
              </label>
              <select
                className="w-full h-10 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] rounded-xl text-sm px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                value={editingCourse.departmentId}
                onChange={(e) => setEditingCourse({ ...editingCourse, departmentId: e.target.value })}
              >
                <option value="cs">Computer Science</option>
                <option value="it">Information Technology</option>
                <option value="is">Information Systems</option>
                <option value="cpe">Computer Engineering</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#12131b] border border-gray-200 dark:border-[#222433]">
              <div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white block">Status</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {editingCourse.active ? "Course is active and visible in registration" : "Course is inactive"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingCourse({ ...editingCourse, active: !editingCourse.active })}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  editingCourse.active
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                    : "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                }`}
              >
                {editingCourse.active ? "Active" : "Inactive"}
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#222433]">
              <Button type="button" variant="outline" onClick={() => setEditingCourse(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={updating}>
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default Courses;
