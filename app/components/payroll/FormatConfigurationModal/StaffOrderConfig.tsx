import type { CSVStaffOrderConfig } from '@/types';

interface StaffOrderConfigProps {
  staffOrder: CSVStaffOrderConfig;
  onChange: (staffOrder: CSVStaffOrderConfig) => void;
}

export function StaffOrderConfig({ staffOrder, onChange }: StaffOrderConfigProps) {
  return (
    <div>
      <h4 className="form-label">Staff Order</h4>
      <p className="text-sm text-gray-500 mb-3">Choose how to order staff rows in the export</p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="order-type" className="form-label text-sm">
            Order By
          </label>
          <select
            id="order-type"
            value={staffOrder.type}
            onChange={(e) =>
              onChange({
                ...staffOrder,
                type: e.target.value as 'id' | 'name' | 'custom',
              })
            }
            className="form-select w-full"
          >
            <option value="name">Staff Name</option>
            <option value="id">Employee ID</option>
            <option value="custom">Custom Order</option>
          </select>
        </div>

        <div>
          <label htmlFor="order-direction" className="form-label text-sm">
            Direction
          </label>
          <select
            id="order-direction"
            value={staffOrder.direction}
            onChange={(e) =>
              onChange({
                ...staffOrder,
                direction: e.target.value as 'asc' | 'desc',
              })
            }
            className="form-select w-full"
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>
      </div>

      {staffOrder.type === 'custom' && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            Custom ordering is not yet implemented. Staff will be ordered by name.
          </p>
        </div>
      )}
    </div>
  );
}
