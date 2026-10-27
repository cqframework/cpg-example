The recommendations in this implementation guide are intentionally simplified to support demonstration applications. Each one has a PlanDefinition whose single action applies when its CQL condition is true, and then proposes the activity in its ActivityDefinition.

Each test case is a Bundle with a Patient (with the same id as the Bundle) and the resources that make up the scenario. Test cases named `Needs…` should result in the activity being proposed; the others should not.

### Daily Apple

*An apple a day keeps the doctor away.*

[DailyAppleRecommendation](PlanDefinition-DailyAppleRecommendation.html) proposes a daily apple ([DailyAppleActivity](ActivityDefinition-DailyAppleActivity.html), a MedicationRequest for a medication in the [Apple](ValueSet-Apple.html) value set) for an active patient who has neither an active order for a daily apple, nor an active order _not_ to give one.

The logic ([DailyAppleLogic](Library-DailyAppleLogic.html)) considers an `active` MedicationRequest to be sufficient to meet the intent of the recommendation. It does not attempt to track medication dispensing or adherence; demonstration applications can (and should) take the additional step of demonstrating the dispense of a medication.

Test cases:

{% for r in site.data.resources %}{% if r[0] contains "Bundle/" and r[0] contains "DailyApple" %}
* [{{ r[0] | remove: "Bundle/" }}]({{ r[1].path }}) - {% if r[0] contains "Bundle/Needs" %}proposes a daily apple{% else %}proposes nothing{% endif %}{% endif %}{% endfor %}

### Spoonful Of Sugar

*A spoonful of sugar helps the medicine go down.*

[SpoonfulOfSugarRecommendation](PlanDefinition-SpoonfulOfSugarRecommendation.html) proposes a spoonful of sugar ([SpoonfulOfSugarActivity](ActivityDefinition-SpoonfulOfSugarActivity.html), a ServiceRequest for a service in the [Sugar](ValueSet-Sugar.html) value set) for an active patient with at least one active medication order, unless the patient already has an active order for a spoonful of sugar, or an active order _not_ to give one.

The logic is in [SpoonfulOfSugarLogic](Library-SpoonfulOfSugarLogic.html). In the test cases, the active medication is a daily apple order, as the daily apple recommendation would produce.

Test cases:

{% for r in site.data.resources %}{% if r[0] contains "Bundle/" and r[0] contains "SpoonfulOfSugar" %}
* [{{ r[0] | remove: "Bundle/" }}]({{ r[1].path }}) - {% if r[0] contains "Bundle/Needs" %}proposes a spoonful of sugar{% else %}proposes nothing{% endif %}{% endif %}{% endfor %}

### Running a test case

Call `$apply` on the PlanDefinition with the test case as `data` and its Patient as `subject`:

```http
POST [base]/PlanDefinition/DailyAppleRecommendation/$apply
Content-Type: application/fhir+json

{
  "resourceType": "Parameters",
  "parameter": [
    { "name": "subject", "valueString": "Patient/NeedsDailyAppleOrder" },
    { "name": "data", "resource": { "resourceType": "Bundle", "id": "NeedsDailyAppleOrder", ... } }
  ]
}
```

The response is a CarePlan. When the recommendation applies, it contains a RequestGroup with the action, and the proposed MedicationRequest or ServiceRequest.
