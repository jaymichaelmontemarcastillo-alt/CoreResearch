import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Unauthorized = () => {
  const { role } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-rose-500/20 bg-rose-950/10 text-center space-y-5">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-white">Access Denied</h1>
          <p className="text-sm text-slate-400 mt-1">
            Your account role (<span className="text-rose-400 font-semibold">{role || 'Guest'}</span>) does not have permission to access this portal.
          </p>
        </div>

        <div className="pt-2">
          <Link to="/dashboard">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" /> Return to Dashboard
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};
