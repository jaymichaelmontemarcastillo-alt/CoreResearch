import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { GraduationCap, User, Building, Contact, CheckCircle2, ArrowRight } from 'lucide-react';

import api from '../services/api';

export const Onboarding = () => {
  const { currentUser, userProfile, updateProfileLocal } = useAuth();
  const navigate = useNavigate();

  // Pre-fill from Google info
  const initialNameParts = currentUser?.displayName ? currentUser.displayName.split(' ') : ['', ''];
  const [firstName, setFirstName] = useState(initialNameParts[0] || '');
  const [lastName, setLastName] = useState(initialNameParts.slice(1).join(' ') || '');
  const [role, setRole] = useState(userProfile?.role || 'student');
  const [department, setDepartment] = useState(userProfile?.department || 'Computer Studies');
  const [studentIdOrEmployeeId, setStudentIdOrEmployeeId] = useState(userProfile?.studentIdOrEmployeeId || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!firstName || !lastName || !studentIdOrEmployeeId) {
      return setError('Please complete all required profile fields.');
    }

    setLoading(true);
    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    try {
      // Sync complete profile with Express API backend
      await api.post('/auth/register', {
        uid: currentUser.uid,
        email: currentUser.email,
        fullName,
        role,
        department,
        studentIdOrEmployeeId
      });

      if (updateProfileLocal) {
        updateProfileLocal({
          uid: currentUser.uid,
          email: currentUser.email,
          fullName,
          role,
          department,
          studentIdOrEmployeeId,
          needsOnboarding: false
        });
      }

      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-xl">
        <Card className="border-blue-500/30 space-y-6">
          <div className="text-center space-y-2 border-b border-slate-800 pb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mx-auto mb-1">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-extrabold text-white">Complete Your Google Profile</h1>
            <p className="text-xs text-slate-400">
              Signed in as <strong className="text-blue-400">{currentUser?.email}</strong>. Provide your university credentials to finish registration.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium text-left">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="First Name"
                type="text"
                placeholder="e.g. Alex"
                icon={User}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />

              <Input
                label="Last Name"
                type="text"
                placeholder="e.g. Rivera"
                icon={User}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>

            {/* Role Picker */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Select Your Role
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'student', label: 'Student' },
                  { id: 'adviser', label: 'Adviser' },
                  { id: 'panelist', label: 'Panelist' },
                  { id: 'admin', label: 'Admin' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setRole(item.id)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                      role === item.id
                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Department / College"
                type="text"
                placeholder="e.g. Computer Studies"
                icon={Building}
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required
              />

              <Input
                label={role === 'student' ? 'Student ID Number' : 'Employee ID Number'}
                type="text"
                placeholder="e.g. 2024-1002"
                icon={Contact}

                value={studentIdOrEmployeeId}
                onChange={(e) => setStudentIdOrEmployeeId(e.target.value)}
                required
              />
            </div>

            <Button type="submit" variant="primary" className="w-full mt-2" isLoading={loading}>
              Complete Registration & Access Workspace <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};
