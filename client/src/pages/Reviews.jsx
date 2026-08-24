// src/pages/Reviews.jsx
import React, { useState, useEffect } from "react";
import api from "../services/api";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Textarea } from "../components/ui/Textarea";
import { Select } from "../components/ui/Select";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { Toast } from "../components/ui/Toast";
import {
  HiChatBubbleLeftRight,
  HiPaperAirplane,
  HiCheckBadge,
  HiAcademicCap,
  HiChatBubbleBottomCenterText,
} from "react-icons/hi2";
import { useAuth } from "../context/AuthContext";

export const Reviews = () => {
  const { role } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Post review form
  const [chapter, setChapter] = useState("Chapter 1 - Introduction");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");

  // Student response state
  const [respondingId, setRespondingId] = useState(null);
  const [studentResponseText, setStudentResponseText] = useState("");

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await api.get("/reviews/all");
      if (res.data && res.data.data) {
        setReviews(res.data.data);
      }
    } catch (err) {
      console.error("[Reviews] fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handlePostReview = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setSubmitting(true);
    try {
      await api.post("/reviews", {
        chapter,
        comment,
      });

      setToast("Feedback annotation posted successfully!");
      setComment("");
      await fetchReviews();
    } catch (err) {
      alert(`Error posting review: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddressReview = async (reviewId) => {
    if (!studentResponseText.trim()) {
      return alert("Please enter notes on how you revised the manuscript.");
    }

    try {
      await api.patch(`/reviews/${reviewId}/status`, {
        status: "addressed",
        studentResponse: studentResponseText,
      });

      setToast("Revision response saved and marked as Addressed.");
      setRespondingId(null);
      setStudentResponseText("");
      await fetchReviews();
    } catch (err) {
      alert(`Error submitting response: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={HiChatBubbleLeftRight}
        title="Review & Threaded Feedback Workspace"
        description="Adviser & Panelist chapter annotations, revision tracking, and student response threads."
      />

      {toast && (
        <Toast message={toast} variant="success" onClose={() => setToast("")} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Top: Post Review Box (Adviser & Panelist & Admin) */}
        {(role === "adviser" || role === "panelist" || role === "admin") && (
          <div className="lg:col-span-5">
            <Card className="space-y-4 sticky top-20">
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <HiChatBubbleBottomCenterText className="w-5 h-5 text-primary" /> Post Manuscript Review Feedback
              </h2>

              <form onSubmit={handlePostReview} className="space-y-4">
                <Select
                  label="Target Chapter / Section"
                  value={chapter}
                  onChange={(e) => setChapter(e.target.value)}
                >
                  <option value="Chapter 1 - Introduction">Chapter 1 - Introduction</option>
                  <option value="Chapter 2 - Literature Review">Chapter 2 - Literature Review</option>
                  <option value="Chapter 3 - Methodology">Chapter 3 - Methodology & System Design</option>
                  <option value="Chapter 4 - Results & Discussion">Chapter 4 - Results & Data Analysis</option>
                  <option value="Chapter 5 - Conclusion & Future Work">Chapter 5 - Conclusion & Recommendations</option>
                </Select>

                <Textarea
                  label="Detailed Review Remarks & Annotations"
                  rows={4}
                  placeholder="Specify necessary revisions, methodology corrections, or formatting changes..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  required
                />

                <Button type="submit" variant="primary" isLoading={submitting} className="w-full">
                  <HiPaperAirplane className="w-4 h-4 mr-2" /> Post Review Feedback
                </Button>
              </form>
            </Card>
          </div>
        )}

        {/* Right / Main: Threaded Feedback Feed */}
        <div className={(role === "adviser" || role === "panelist" || role === "admin") ? "lg:col-span-7 space-y-4" : "lg:col-span-12 space-y-4"}>
          {loading ? (
            <div className="py-12 text-center text-gray-400 dark:text-gray-500">Loading review thread...</div>
          ) : reviews.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={HiChatBubbleLeftRight}
                title="No Review Comments Yet"
                description="Advisers and panelists will post chapter feedback and revision requests here."
              />
            </Card>
          ) : (
            reviews.map((rev) => (
              <Card key={rev.id} className="space-y-4">
                {/* Header info */}
                <div className="flex items-start justify-between gap-2 border-b border-gray-200 dark:border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant={rev.reviewerRole === "adviser" ? "emerald" : "purple"}>
                        {rev.reviewerRole ? rev.reviewerRole.toUpperCase() : "REVIEWER"}
                      </Badge>
                      <span className="text-xs font-bold text-primary dark:text-blue-400">{rev.chapter}</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5">
                      <HiCheckBadge className="w-3.5 h-3.5 text-gray-400" />
                      <span>
                        Posted by <strong className="text-gray-700 dark:text-gray-300">{rev.reviewerName}</strong> on{" "}
                        {new Date(rev.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <Badge variant={rev.status === "addressed" ? "emerald" : "amber"}>
                    {rev.status === "addressed" ? "ADDRESSED" : "PENDING REVISION"}
                  </Badge>
                </div>

                {/* Reviewer Comment Body */}
                <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-slate-800/60 p-3.5 rounded-lg border border-gray-200 dark:border-slate-800">
                  {rev.comment}
                </div>

                {/* Student Response Thread */}
                {rev.studentResponse ? (
                  <div className="p-3.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 space-y-1 ml-4 border-l-4 border-l-primary">
                    <div className="text-xs font-bold text-primary dark:text-blue-400 flex items-center gap-1">
                      <HiAcademicCap className="w-3.5 h-3.5" /> Student Revision Response:
                    </div>
                    <p className="text-xs text-gray-700 dark:text-gray-300 italic">{rev.studentResponse}</p>
                  </div>
                ) : role === "student" ? (
                  respondingId === rev.id ? (
                    <div className="space-y-2 pt-2">
                      <Textarea
                        rows={2}
                        placeholder="Explain changes made in the latest revision manuscript..."
                        value={studentResponseText}
                        onChange={(e) => setStudentResponseText(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" variant="success" onClick={() => handleAddressReview(rev.id)}>
                          Submit Revision & Resolve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setRespondingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRespondingId(rev.id)}
                    >
                      Respond & Mark as Addressed
                    </Button>
                  )
                ) : null}
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
