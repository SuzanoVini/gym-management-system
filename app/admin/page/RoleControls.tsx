'use client';

import { Check, Crown, User, X } from 'lucide-react';
import { ROLE_INFO, USER_ROLES, type UserRole } from './roles';

const BADGE: Record<UserRole, string> = {
  owner: 'bg-amber-50 text-amber-800 border-amber-200',
  staff: 'bg-slate-50 text-slate-700 border-slate-200',
};

const ICON: Record<UserRole, typeof Crown> = { owner: Crown, staff: User };

export function RoleBadge({ role }: { role: UserRole }) {
  const Icon = ICON[role];
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${BADGE[role]}`}
    >
      <Icon className="w-3 h-3" />
      {ROLE_INFO[role].label}
    </span>
  );
}

interface RoleSelectProps {
  role: UserRole;
  label: string;
  disabled?: boolean;
  onChange: (role: UserRole) => void;
}

export function RoleSelect({ role, label, disabled, onChange }: RoleSelectProps) {
  return (
    <select
      value={role}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as UserRole)}
      aria-label={label}
      className={`text-xs font-medium rounded-full px-2 py-1 border cursor-pointer focus:outline-none focus:ring-1 focus:ring-red-400 disabled:cursor-not-allowed disabled:opacity-70 ${BADGE[role]}`}
    >
      {USER_ROLES.map((r) => (
        <option key={r} value={r}>
          {ROLE_INFO[r].label}
        </option>
      ))}
    </select>
  );
}

export function RolePermissionsCard() {
  return (
    <div className="section-container">
      <h2 className="text-base font-semibold text-gray-900">What each role can do</h2>
      <p className="text-sm text-slate-500 mt-0.5 mb-4">
        Roles are enforced by the database, not just hidden in the menu.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {USER_ROLES.map((role) => {
          const info = ROLE_INFO[role];
          return (
            <div key={role} className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <RoleBadge role={role} />
                <span className="text-sm text-slate-500">{info.summary}</span>
              </div>
              <ul className="mt-3 space-y-1.5 text-sm">
                {info.can.map((item) => (
                  <li key={item} className="flex gap-2 text-gray-700">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
                {info.cannot.map((item) => (
                  <li key={item} className="flex gap-2 text-gray-400">
                    <X className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
