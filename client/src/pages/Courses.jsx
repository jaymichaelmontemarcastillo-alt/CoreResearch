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
  HiChevronRight,
  HiChevronDown,
} from "react-icons/hi2";
import { courseService } from "../services/course.service";
import { useConfirm } from "../context/ConfirmContext";

export const Courses = () => {
  const { confirm } = useConfirm();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVariant, setToastVariant] = useState("success");

  // Form states for Course
  const [isAdding, setIsAdding] = useState(false);
  const [newCourse, setNewCourse] = useState({
    code: "",
    name: "",
    departmentId: "cs",
    active: true,
  });
  const [saving, setSaving] = useState(false);

  // Edit Course state
  const [editingCourse, setEditingCourse] = useState(null);
  const [updating, setUpdating] = useState(false);

  // Tree Table States
  const [expandedCourses, setExpandedCourses] = useState({});
  const [expandedSpecs, setExpandedSpecs] = useState({});
  
  // Modal State for Specialization
  const [isAddingSpec, setIsAddingSpec] = useState(false);
  const [newSpecForm, setNewSpecForm] = useState({ courseId: "", code: "", name: "" });
  const [savingSpec, setSavingSpec] = useState(false);

  // Modal State for Sections
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionForm, setNewSectionForm] = useState({ courseId: "", specId: "", name: "" });
  const [savingSection, setSavingSection] = useState(false);

  // Sections State per Specialization (Mocked Data Cache)
  const [specSections, setSpecSections] = useState({});
  const [loadingSections, setLoadingSections] = useState({});

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

  // -------------------------------------------------------------
  // Course CRUD Logic
  // -------------------------------------------------------------
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await courseService.createCourse({
        code: newCourse.code.toUpperCase(),
        name: newCourse.name,
        departmentId: newCourse.departmentId,
        active: true,
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
        active: editingCourse.active,
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

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: "Delete Course",
      message: "Are you sure you want to delete this course?",
      confirmText: "Delete",
      variant: "danger",
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

  // -------------------------------------------------------------
  // Tree Table Logic (Expand/Collapse)
  // -------------------------------------------------------------
  const toggleCourse = (courseId) => {
    setExpandedCourses((prev) => ({
      ...prev,
      [courseId]: !prev[courseId],
    }));
  };

  const toggleSpec = async (courseId, specId) => {
    const isExpanding = !expandedSpecs[specId];
    
    setExpandedSpecs((prev) => ({
      ...prev,
      [specId]: isExpanding,
    }));

    // If expanding and sections aren't cached, mock fetch them
    if (isExpanding && !specSections[specId]) {
      setLoadingSections((prev) => ({ ...prev, [specId]: true }));
      // Mock API latency
      await new Promise((resolve) => setTimeout(resolve, 400));
      setSpecSections((prev) => ({
        ...prev,
        [specId]: [
          { id: `${specId}-sec-a`, name: "A", active: true },
          { id: `${specId}-sec-b`, name: "B", active: true },
          { id: `${specId}-sec-c`, name: "C", active: false },
        ],
      }));
      setLoadingSections((prev) => ({ ...prev, [specId]: false }));
    }
  };

  // -------------------------------------------------------------
  // Add & Delete Specialization Logic
  // -------------------------------------------------------------
  const openAddSpecModal = (courseId) => {
    setNewSpecForm({ courseId, code: "", name: "" });
    setIsAddingSpec(true);
  };

  const handleAddSpecSubmit = async (e) => {
    e.preventDefault();
    setSavingSpec(true);
    await new Promise((resolve) => setTimeout(resolve, 500)); // Mock Async Submit

    const newSpec = {
      id: newSpecForm.code.toLowerCase(),
      code: newSpecForm.code.toUpperCase(),
      name: newSpecForm.name,
    };

    setCourses((prevCourses) =>
      prevCourses.map((c) => {
        if (c.id === newSpecForm.courseId) {
          return {
            ...c,
            specializations: [...(c.specializations || []), newSpec],
          };
        }
        return c;
      })
    );

    setExpandedCourses((prev) => ({ ...prev, [newSpecForm.courseId]: true }));
    setIsAddingSpec(false);
    setSavingSpec(false);
    showToast("Specialization added successfully.");
  };

  const handleDeleteSpec = async (courseId, specId) => {
    const isConfirmed = await confirm({
      title: "Delete Specialization",
      message: "Are you sure you want to delete this specialization?",
      confirmText: "Delete",
      variant: "danger",
    });
    if (!isConfirmed) return;

    await new Promise((resolve) => setTimeout(resolve, 300)); // Mock API delay
    
    setCourses((prevCourses) =>
      prevCourses.map((c) => {
        if (c.id === courseId) {
          return {
            ...c,
            specializations: c.specializations.filter(s => s.id !== specId)
          };
        }
        return c;
      })
    );
    showToast("Specialization deleted.");
  };

  // -------------------------------------------------------------
  // Add & Delete Sections Logic
  // -------------------------------------------------------------
  const openAddSectionModal = (courseId, specId) => {
    setNewSectionForm({ courseId, specId, name: "" });
    setIsAddingSection(true);
  };

  const handleAddSectionSubmit = async (e) => {
    e.preventDefault();
    setSavingSection(true);
    await new Promise((resolve) => setTimeout(resolve, 400)); // Mock Async Submit

    const newSection = {
      id: `${newSectionForm.specId}-sec-${newSectionForm.name.toLowerCase()}`,
      name: newSectionForm.name,
      active: true,
    };

    setSpecSections((prev) => {
       const existing = prev[newSectionForm.specId] || [];
       return {
         ...prev,
         [newSectionForm.specId]: [...existing, newSection]
       };
    });

    setIsAddingSection(false);
    setSavingSection(false);
    showToast("Section added successfully.");
  };

  const handleDeleteSection = async (specId, sectionId) => {
    const isConfirmed = await confirm({
      title: "Delete Section",
      message: "Are you sure you want to delete this section?",
      confirmText: "Delete",
      variant: "danger",
    });
    if (!isConfirmed) return;

    await new Promise((resolve) => setTimeout(resolve, 200)); // Mock API delay
    
    setSpecSections((prev) => ({
      ...prev,
      [specId]: prev[specId].filter(s => s.id !== sectionId)
    }));
    showToast("Section deleted.");
  };

  const columns = [
    { label: "Code", className: "w-[200px]" },
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

      {/* Add Course Form */}
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

      {/* Modern Multi-Level Expandable Tree Table */}
      <Card className="overflow-hidden bg-white dark:bg-[#15161e] border border-gray-200 dark:border-[#222433] shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-[#111218] border-b border-gray-200 dark:border-[#222433]">
              <tr>
                {columns.map((col, i) => (
                  <th
                    key={i}
                    className={`py-3.5 px-4 text-[13px] font-semibold text-gray-500 dark:text-[#9396a8] whitespace-nowrap ${col.className || ""}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#222433]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    Loading courses...
                  </td>
                </tr>
              ) : courses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    No courses found.
                  </td>
                </tr>
              ) : (
                courses.map((course) => (
                  <React.Fragment key={course.id}>
                    {/* Level 1: Course Row */}
                    <tr className="hover:bg-gray-50/50 dark:hover:bg-[#1c1d28]/40 transition group">
                      <td className="py-3.5 px-4 font-semibold text-gray-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleCourse(course.id)}
                            className="p-1 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                          >
                            {expandedCourses[course.id] ? (
                              <HiChevronDown className="w-4 h-4" />
                            ) : (
                              <HiChevronRight className="w-4 h-4" />
                            )}
                          </button>
                          {course.code}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-gray-700 dark:text-gray-300">
                        {course.name}
                      </td>
                      <td className="py-3.5 px-4 text-gray-500 dark:text-gray-400">
                        <Badge variant="blue">{course.departmentId.toUpperCase()}</Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={course.active ? "emerald" : "gray"}>
                          {course.active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
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
                      </td>
                    </tr>

                    {/* Level 2: Specializations (Nested under Course) */}
                    {expandedCourses[course.id] && (
                      <tr className="bg-blue-50/20 dark:bg-blue-950/10">
                        <td colSpan={5} className="p-0 border-b-0">
                          <div className="pl-12 pr-4 py-4 animate-in slide-in-from-top-2 fade-in duration-300">
                            <div className="flex items-center justify-between mb-3 border-b border-gray-200 dark:border-[#222433] pb-2">
                              <h4 className="text-[13px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                Specializations
                              </h4>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800/60 dark:text-blue-400 dark:hover:bg-blue-900/30"
                                onClick={() => openAddSpecModal(course.id)}
                              >
                                <HiPlus className="w-3 h-3 mr-1" /> Add Specialization
                              </Button>
                            </div>

                            {(!course.specializations || course.specializations.length === 0) ? (
                              <div className="text-sm text-gray-500 dark:text-gray-400 py-3 italic bg-white dark:bg-[#111218] rounded-lg border border-dashed border-gray-200 dark:border-gray-800 text-center">
                                No specializations found for this course.
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {course.specializations.map((spec) => (
                                  <div
                                    key={spec.id}
                                    className="bg-white dark:bg-[#111218] border border-gray-200 dark:border-[#222433] rounded-xl overflow-hidden shadow-sm transition-all"
                                  >
                                    <div className="flex items-center justify-between py-2.5 px-4 hover:bg-gray-50 dark:hover:bg-[#1c1d28]/40">
                                      <div className="flex items-center gap-3">
                                        <button
                                          onClick={() => toggleSpec(course.id, spec.id)}
                                          className="p-1 rounded bg-gray-100 dark:bg-[#222433] text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition"
                                        >
                                          {expandedSpecs[spec.id] ? (
                                            <HiChevronDown className="w-3.5 h-3.5" />
                                          ) : (
                                            <HiChevronRight className="w-3.5 h-3.5" />
                                          )}
                                        </button>
                                        <div>
                                          <span className="font-semibold text-gray-900 dark:text-white mr-2">
                                            {spec.code}
                                          </span>
                                          <span className="text-gray-600 dark:text-gray-400 text-sm">
                                            {spec.name}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3">

                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleDeleteSpec(course.id, spec.id); }}
                                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition"
                                          title="Delete Specialization"
                                        >
                                          <HiTrash className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Level 3: Sections (Nested under Specialization) */}
                                    {expandedSpecs[spec.id] && (
                                      <div className="bg-gray-50/50 dark:bg-[#0e0f15] border-t border-gray-100 dark:border-[#222433] pl-14 pr-4 py-3 animate-in fade-in duration-300">
                                        <div className="flex items-center justify-between mb-2">
                                          <h5 className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                            <span className="w-4 border-t border-gray-300 dark:border-gray-700"></span>
                                            Sections
                                          </h5>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-6 text-[10px] px-2 py-0 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800/60 dark:text-blue-400 dark:hover:bg-blue-900/30"
                                            onClick={() => openAddSectionModal(course.id, spec.id)}
                                          >
                                            <HiPlus className="w-3 h-3 mr-1" /> Add Section
                                          </Button>
                                        </div>

                                        {loadingSections[spec.id] ? (
                                          <div className="text-sm text-gray-400 py-1">Loading sections...</div>
                                        ) : (!specSections[spec.id] || specSections[spec.id].length === 0) ? (
                                          <div className="text-sm text-gray-500 italic py-2 px-3 border border-dashed border-gray-200 dark:border-[#2a2d3d] rounded-lg">
                                            No sections available.
                                          </div>
                                        ) : (
                                          <div className="flex flex-col border border-gray-200 dark:border-[#2a2d3d] rounded-lg overflow-hidden shadow-sm">
                                            {specSections[spec.id].map((sec, idx) => (
                                              <div
                                                key={sec.id}
                                                className={`flex items-center justify-between p-2.5 bg-white dark:bg-[#1a1b26] hover:bg-gray-50 dark:hover:bg-[#1c1d28]/70 transition-colors ${
                                                  idx !== specSections[spec.id].length - 1 ? 'border-b border-gray-100 dark:border-[#2a2d3d]' : ''
                                                }`}
                                              >
                                                <span className="font-medium text-gray-800 dark:text-gray-200 text-sm">
                                                  Section {sec.name}
                                                </span>
                                                <div className="flex items-center gap-3">
                                                  <Badge variant={sec.active ? "emerald" : "gray"} className="text-[10px] uppercase">
                                                    {sec.active ? "Active" : "Archived"}
                                                  </Badge>
                                                  <button
                                                    onClick={() => handleDeleteSection(spec.id, sec.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition"
                                                    title="Delete Section"
                                                  >
                                                    <HiTrash className="w-4 h-4" />
                                                  </button>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Specialization Modal */}
      <Modal
        isOpen={isAddingSpec}
        onClose={() => setIsAddingSpec(false)}
        title="Add Specialization"
        icon={HiPlus}
      >
        <form onSubmit={handleAddSpecSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              Specialization Code
            </label>
            <Input
              value={newSpecForm.code}
              onChange={(e) => setNewSpecForm({ ...newSpecForm, code: e.target.value })}
              required
              placeholder="e.g. WMAD"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              Specialization Name
            </label>
            <Input
              value={newSpecForm.name}
              onChange={(e) => setNewSpecForm({ ...newSpecForm, name: e.target.value })}
              required
              placeholder="e.g. Web and Mobile Application Development"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#222433]">
            <Button type="button" variant="outline" onClick={() => setIsAddingSpec(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={savingSpec}>
              Save Specialization
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Section Modal */}
      <Modal
        isOpen={isAddingSection}
        onClose={() => setIsAddingSection(false)}
        title="Add New Section"
        icon={HiPlus}
      >
        <form onSubmit={handleAddSectionSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              Section Name
            </label>
            <Input
              value={newSectionForm.name}
              onChange={(e) => setNewSectionForm({ ...newSectionForm, name: e.target.value })}
              required
              placeholder="e.g. A"
              maxLength={2}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#222433]">
            <Button type="button" variant="outline" onClick={() => setIsAddingSection(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={savingSection}>
              Save Section
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Course Modal (Unchanged) */}
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
                onChange={(e) =>
                  setEditingCourse({ ...editingCourse, code: e.target.value.toUpperCase() })
                }
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
                onChange={(e) =>
                  setEditingCourse({ ...editingCourse, departmentId: e.target.value })
                }
              >
                <option value="cs">Computer Science</option>
                <option value="it">Information Technology</option>
                <option value="is">Information Systems</option>
                <option value="cpe">Computer Engineering</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#12131b] border border-gray-200 dark:border-[#222433]">
              <div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white block">
                  Status
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {editingCourse.active
                    ? "Course is active and visible in registration"
                    : "Course is inactive"}
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
