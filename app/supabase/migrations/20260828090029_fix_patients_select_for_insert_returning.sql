-- INSERT ... RETURNING re-checks the SELECT policy against the brand-new
-- row. is_caregiver_for(id) only becomes true once the on_patient_created
-- trigger has inserted the access-grant row in patient_caregiver_access,
-- which isn't visible in time for that same statement's RETURNING clause,
-- so `.insert(...).select()` from the client failed RLS even though the
-- insert itself was allowed. A caregiver should always be able to see a
-- patient they just created, regardless of the grant-table timing.

drop policy "patients_select" on public.patients;

create policy "patients_select" on public.patients
  for select using (public.is_caregiver_for(id) or created_by = auth.uid());
