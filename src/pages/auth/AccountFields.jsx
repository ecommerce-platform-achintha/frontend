import { LIMITS } from '@/utils/validators'
import FormField from '@/components/ui/FormField'
import Input from '@/components/ui/Input'
import PasswordInput from '@/components/ui/PasswordInput'

// Name, contact, NIC and password fields shared by both sign-up forms.
// `onChange(field, value)` updates the parent's state.
export default function AccountFields({ values, errors, onChange }) {
  const bind = (field) => ({ value: values[field], onChange: (e) => onChange(field, e.target.value) })
  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="First name" error={errors.firstName} required>
          <Input autoComplete="given-name" maxLength={LIMITS.name} {...bind('firstName')} />
        </FormField>
        <FormField label="Last name" error={errors.lastName} required>
          <Input autoComplete="family-name" maxLength={LIMITS.name} {...bind('lastName')} />
        </FormField>
      </div>
      <FormField label="Email" error={errors.email} required>
        <Input type="email" autoComplete="email" maxLength={LIMITS.email} {...bind('email')} />
      </FormField>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Mobile number" hint="For example +94771234567" error={errors.phone} required>
          <Input type="tel" autoComplete="tel" inputMode="tel" placeholder="+94771234567" maxLength={20} {...bind('phone')} />
        </FormField>
        <FormField label="NIC number" hint="Old (123456789V) or new (12 digits)" error={errors.nic} required>
          <Input autoComplete="off" maxLength={12} {...bind('nic')} />
        </FormField>
      </div>
      <FormField label="Password" error={errors.password} required>
        <PasswordInput autoComplete="new-password" maxLength={LIMITS.passwordMax} showChecklist {...bind('password')} />
      </FormField>
      <FormField label="Confirm password" error={errors.confirmPassword} required>
        <PasswordInput autoComplete="new-password" maxLength={LIMITS.passwordMax} {...bind('confirmPassword')} />
      </FormField>
    </div>
  )
}
