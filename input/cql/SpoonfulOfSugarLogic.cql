library SpoonfulOfSugarLogic

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1'

valueset "Sugar": 'http://fhir.org/guides/cqf/cpg/example/ValueSet/Sugar'

context Patient

define "Inclusion Criteria":
  Patient.active
    and exists "Active Medications"

define "Active Medications":
  [MedicationRequest] MR
    where MR.intent = 'order'
      and MR.status = 'active'
      and MR.doNotPerform is not true

define "Active Spoonful Of Sugar":
  [ServiceRequest: "Sugar"] SR
    where SR.intent = 'order'
      and SR.status = 'active'
      and SR.doNotPerform is not true

define "Prohibitions For Spoonful Of Sugar":
  [ServiceRequest: "Sugar"] SR
    where SR.intent = 'order'
      and SR.status = 'active'
      and SR.doNotPerform is true

define "Should Recommend Spoonful Of Sugar":
  "Inclusion Criteria"
    and not exists "Active Spoonful Of Sugar"
    and not exists "Prohibitions For Spoonful Of Sugar"
