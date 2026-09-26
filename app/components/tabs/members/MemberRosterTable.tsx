import { toRosterStatus } from '@/lib/members/derivedStatus';
import type { DisplayMember } from '@/lib/members/memberRoster';

export default function MemberRosterTable({
  filteredCount,
  paginated,
  setSelectedMember,
}: {
  filteredCount: number;
  paginated: DisplayMember[];
  setSelectedMember: (member: DisplayMember) => void;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b">
        <h3 className="text-lg font-semibold">Roster ({filteredCount})</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Plan
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Member Since
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                  No members match your filters.
                </td>
              </tr>
            ) : (
              paginated.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {member.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {member.membership_type || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {member.join_date || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-block text-xs px-2 py-1 rounded-full font-medium ${
                        member.derivedStatus === 'Active'
                          ? 'bg-green-100 text-green-700'
                          : member.derivedStatus === 'On Hold'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {toRosterStatus(member.derivedStatus)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedMember(member)}
                      className="text-red-600 hover:text-red-800 text-sm font-semibold"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
