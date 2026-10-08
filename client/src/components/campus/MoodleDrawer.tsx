'use client';

import React, { useState, useEffect, useEffectEvent } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { MoodleAssignment } from '@/types/chat';
import {
  GraduationCap,
  RefreshCw,
  ExternalLink,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  BookOpen,
  X,
  Bell,
  Sparkles,
  Filter,
  Lock,
} from 'lucide-react';

interface MoodleDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCourseCode?: string;
  onBroadcastAlert?: (alertText: string) => void;
  isAdmin?: boolean;
}

const COURSES = [
  { code: 'IC152', name: 'Computing & Data Science' },
  { code: 'CS302', name: 'Database Systems' },
  { code: 'EE201', name: 'Signals & Systems' },
  { code: 'IC110', name: 'Electrical Science' },
  { code: 'IC252', name: 'Probability & Statistics' },
  { code: 'IC160', name: 'Engineering Thermodynamics' },
  { code: 'ME301', name: 'Fluid Mechanics' },
  { code: 'CE301', name: 'Structural Analysis' },
  { code: 'DP201', name: 'Design Practicum / ISTP' },
];

export const MoodleDrawer: React.FC<MoodleDrawerProps> = ({
  isOpen,
  onClose,
  defaultCourseCode = 'IC152',
  onBroadcastAlert,
  isAdmin,
}) => {
  const { error, success } = useToast();
  const { profile } = useAuth();
  const [courseCode, setCourseCode] = useState(defaultCourseCode);
  const [assignments, setAssignments] = useState<MoodleAssignment[]>([]);
  const [lastSynced, setLastSynced] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [now] = useState(() => Date.now());
  const [syncing, setSyncing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'submitted' | 'graded'>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  const roll = profile?.username?.toLowerCase() || '';
  const isCourseAdmin =
    isAdmin !== undefined
      ? isAdmin
      : ['admin', 'gymkhana', 'b22001', 'b23419'].includes(roll) ||
        roll.includes('faculty') ||
        roll.includes('ta_');




  const loadCourseMoodleData = async (code: string) => {
    setLoading(true);
    try {
      const res = await api.getMoodleData(code);
      if (res.data) {
        setAssignments(res.data.assignments || []);
        setLastSynced(res.data.lastSynced || new Date().toISOString());
      }
    } catch (err: unknown) {
      console.error('Failed to load Moodle data:', err);
      error((err instanceof Error ? err.message : '') || 'Could not fetch Moodle LMS data');
    } finally {
      setLoading(false);
    }
  };
  const loadOnOpen = useEffectEvent(() => loadCourseMoodleData(courseCode));
  useEffect(() => { if (isOpen) loadOnOpen(); }, [isOpen, courseCode]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await api.syncMoodle(courseCode);
      if (res.data && res.data.success) {
        success(`Synced successfully with moodle.iitmandi.ac.in!`);
        if (res.data.alert) {
          // If we have broadcast callback, trigger it
          if (onBroadcastAlert) {
            onBroadcastAlert(
              `🤖 **Moodle Bot Alert [${courseCode}]**: New ${res.data.alert.type.toUpperCase()} posted: "${res.data.alert.title}". Due: ${new Date(res.data.alert.dueDate).toLocaleString()} | Weightage: ${res.data.alert.weightage || 'N/A'}`
            );
          }
        }
        await loadCourseMoodleData(courseCode);
      }
    } catch (err: unknown) {
      error((err instanceof Error ? err.message : '') || 'Failed to trigger LMS sync');
    } finally {
      setSyncing(false);
    }
  };

  if (!isOpen) return null;

  const filteredAssignments = assignments.filter((item) => {
    if (activeFilter !== 'all' && item.status !== activeFilter) return false;
    if (selectedType !== 'all' && item.type !== selectedType) return false;
    return true;
  });

  const getTypeBadge = (type: MoodleAssignment['type']) => {
    switch (type) {
      case 'assignment':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/10 text-[var(--accent)] border border-blue-500/20">Assignment</span>;
      case 'quiz':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-500/10 text-[var(--accent)] border border-purple-500/20">Quiz</span>;
      case 'lab':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-[var(--accent)] border border-emerald-500/20">Lab Task</span>;
      case 'grade':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-[var(--accent)] border border-amber-500/20">Grades Out</span>;
      case 'announcement':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">Broadcast</span>;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: MoodleAssignment['status']) => {
    switch (status) {
      case 'submitted':
        return (
          <span className="flex items-center gap-1 text-xs text-[var(--accent)] bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <CheckCircle2 size={12} /> Submitted
          </span>
        );
      case 'graded':
        return (
          <span className="flex items-center gap-1 text-xs text-[var(--accent)] bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
            <Sparkles size={12} /> Graded
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="flex items-center gap-1 text-xs text-[var(--accent)] bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
            <Clock size={12} /> Pending
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl h-full bg-[var(--bg-secondary)] border-l border-[var(--border-subtle)] shadow-2xl flex flex-col transform transition-transform duration-300">
        {/* Drawer Header */}
        <div className="p-6 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-[var(--accent)] border border-purple-500/20 shadow-inner">
              <GraduationCap size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">IIT Mandi Moodle LMS</h2>
                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/10 text-[var(--accent)] border border-emerald-500/20 rounded">
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Connected to <span className="text-[var(--accent)]">moodle.iitmandi.ac.in</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Sync Status Banner & Course Selector */}
        <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label htmlFor="course-select" className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Select Course:
              </label>
              <select
                id="course-select"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-purple-500"
              >
                {COURSES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              {isCourseAdmin ? (
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-[var(--text-primary)] shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
                  {syncing ? 'Syncing...' : 'Sync Moodle Now'}
                </button>
              ) : (
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/5 text-[11px] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                  title="Only Course Instructors and TAs can trigger manual LMS webhook sync"
                >
                  <Lock size={12} className="text-[var(--accent)]" />
                  <span>Read-Only LMS View</span>
                </div>
              )}

              <a
                href="https://moodle.iitmandi.ac.in"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-white/5 hover:bg-white/10 border border-[var(--border-subtle)] transition-colors"
              >
                <ExternalLink size={13} />
                Portal
              </a>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] pt-1">
            <span>
              Last webhook sync: {lastSynced ? new Date(lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Just now'}
            </span>
            <span className="flex items-center gap-1 text-[var(--accent)]/80">
              <Bell size={12} /> Auto-broadcasts enabled for #{courseCode}
            </span>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="px-6 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex items-center justify-between gap-3 overflow-x-auto">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-[var(--bg-secondary)] p-1 rounded-lg border border-[var(--border-subtle)] text-xs">
            {(['all', 'pending', 'submitted', 'graded'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setActiveFilter(st)}
                className={`px-3 py-1 rounded-md capitalize font-medium transition-all ${
                  activeFilter === st
                    ? 'bg-[var(--accent)] text-[var(--on-accent)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <Filter size={13} className="text-[var(--text-secondary)]" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-secondary)] text-xs rounded-md px-2 py-1 focus:outline-none focus:border-purple-500"
            >
              <option value="all">All Types</option>
              <option value="assignment">Assignments</option>
              <option value="quiz">Quizzes</option>
              <option value="lab">Labs</option>
              <option value="grade">Grades</option>
              <option value="announcement">Announcements</option>
            </select>
          </div>
        </div>

        {/* Assignments / Broadcast List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-[var(--text-secondary)] gap-3">
              <RefreshCw className="animate-spin text-[var(--accent)]" size={28} />
              <p className="text-sm">Fetching course data from moodle.iitmandi.ac.in...</p>
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-6 border border-dashed border-[var(--border-subtle)] rounded-2xl bg-[var(--bg-secondary)]">
              <BookOpen size={36} className="text-[var(--text-secondary)] mb-3" />
              <p className="text-sm font-semibold text-[var(--text-secondary)]">No Moodle Items Found</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xs">
                No active tasks or announcements match your filter for {courseCode}. Click &quot;Sync Moodle Now&quot; to fetch fresh updates!
              </p>
            </div>
          ) : (
            filteredAssignments.map((item) => {
              const due = new Date(item.dueDate);
              const isPast = due.getTime() < now;

              return (
                <div
                  key={item.id}
                  className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] hover:border-purple-500/30 rounded-xl p-4 transition-all duration-200 hover:shadow-lg hover:shadow-purple-950/20 group"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getTypeBadge(item.type)}
                      <span className="text-xs font-mono font-bold text-[var(--accent)]">
                        {item.courseCode}
                      </span>
                      {item.weightage && (
                        <span className="text-[11px] font-medium text-[var(--text-secondary)] bg-white/5 px-2 py-0.5 rounded">
                          Weight: {item.weightage}
                        </span>
                      )}
                    </div>
                    {getStatusBadge(item.status)}
                  </div>

                  <h3 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                    {item.title}
                  </h3>

                  <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                    {item.description}
                  </p>

                  <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                      <Clock size={12} className={isPast ? 'text-rose-400' : 'text-[var(--accent)]'} />
                      <span className={isPast ? 'text-rose-400/90 font-medium' : ''}>
                        {isPast ? 'Closed: ' : 'Due: '}
                        {due.toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          weekday: 'short',
                        })}{' '}
                        at{' '}
                        {due.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {onBroadcastAlert && isCourseAdmin && (
                        <button
                          onClick={() => {
                            onBroadcastAlert(
                              `🔔 **Moodle Alert [${item.courseCode}]**: ${item.title} - Due ${due.toLocaleString()}`
                            );
                            success(`Broadcasted to #${item.courseCode} chat!`);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                          title="Broadcast to current chat"
                        >
                          <Bell size={11} /> Broadcast
                        </button>
                      )}

                      <a
                        href={item.moodleUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-purple-600/20 hover:bg-purple-600/40 text-[var(--accent)] text-[11px] font-medium border border-purple-500/30 transition-colors"
                      >
                        <ExternalLink size={11} />
                        Open on Moodle
                      </a>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Info */}
        <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span>IIT Mandi LMS Webhook v2.4</span>
          <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)] text-[var(--on-accent)] animate-pulse"></span>
            Moodle Daemon Healthy
          </span>
        </div>
      </div>
    </div>
  );
};
