import { FormField } from '@/components/ui/Form';
import type { IntroFormValues } from './introFormValues';

const TIME_OPTIONS = [
  '6:00 AM',
  '6:30 AM',
  '7:00 AM',
  '7:30 AM',
  '8:00 AM',
  '8:30 AM',
  '9:00 AM',
  '9:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '12:00 PM',
  '12:30 PM',
  '4:00 PM',
  '4:30 PM',
  '5:00 PM',
  '5:30 PM',
  '6:00 PM',
  '6:30 PM',
  '7:00 PM',
  '7:30 PM',
  '8:00 PM',
  '8:30 PM',
];

export function IntroTimeField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="time" className="form-label">
        Time
      </label>
      <input
        id="time"
        list="time-options"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type or select a time…"
        className="form-input"
        autoComplete="off"
      />
      <datalist id="time-options">
        {TIME_OPTIONS.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
    </div>
  );
}

export function RequiredOptionsSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="form-label">
        {label}
        <span className="text-red-500 ml-1">*</span>
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={options.length === 0}
        className={`form-select ${options.length === 0 ? '!bg-gray-100 !cursor-not-allowed' : ''}`}
        required
      >
        {options.length === 0 ? (
          <option value="" disabled>
            Loading…
          </option>
        ) : (
          <>
            <option value="">{`Select ${label}`}</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </>
        )}
      </select>
    </div>
  );
}

export function IntroOutcomeFields({
  attended,
  signedUp,
  status,
  updateField,
}: {
  attended: IntroFormValues['attended'];
  signedUp: IntroFormValues['signed_up'];
  status: IntroFormValues['status'];
  updateField: (field: keyof IntroFormValues, value: string | number | readonly string[]) => void;
}) {
  return (
    <>
      <FormField
        label="Attended"
        name="attended"
        type="select"
        value={attended}
        onChange={(value) => updateField('attended', value)}
        options={['', 'Yes', 'No']}
      />

      <FormField
        label="Signed Up"
        name="signed_up"
        type="select"
        value={signedUp}
        onChange={(value) => updateField('signed_up', value)}
        options={['', 'Yes', 'No']}
      />

      <FormField
        label="Status"
        name="status"
        type="select"
        value={status}
        onChange={(value) => updateField('status', value)}
        options={['Active', 'Cancelled', 'Completed']}
      />
    </>
  );
}

export function IntroFormActions({
  loading,
  isEdit,
  onCancel,
}: {
  loading: boolean;
  isEdit: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="flex space-x-3 mt-6">
      <button type="button" onClick={onCancel} className="btn btn-tertiary flex-1">
        Cancel
      </button>
      <button
        type="submit"
        disabled={loading}
        className={`flex-1 ${isEdit ? 'btn btn-primary' : 'btn btn-secondary'}`}
      >
        {loading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
      </button>
    </div>
  );
}
