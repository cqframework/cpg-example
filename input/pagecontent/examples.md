### Activity Examples

The activity examples in this implementation guide provide simplified recommendations for each type of activity to support demonstration applications.

#### Order Medication

A recommendation that a patient should receive an apple a day.

This recommendation is intentionally simplified to support demonstration applications. In particular, the logic considers an `active` MedicationRequest for a medication in the `Apple` value set to be sufficient to meet the intent of the recommendation. In other words, the logic does not attempt to track medication dispensing or adherence. Demonstration applications can (and should) take the additional step of demonstrating the dispense of a medication.

##### Test Scenarios

* NeedsDailyApple - A patient without an active order for a daily apple
* HasDailyApple - A patient with an active order for a daily apple
* RefusedDailyApple - A patient that refused a recommendation to take a daily apple

##### PlanDefinition

The [DailyAppleRecommendation](PlanDefinition-DailyAppleRecommendation.html) PlanDefinition applies if the patient is active and does not have an active order for a daily apple, or an active order _not_ to prescribe a daily apple.

##### Request

##### Response
