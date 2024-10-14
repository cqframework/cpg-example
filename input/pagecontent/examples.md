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

### Service Examples

The service examples in this implementation guide provide illustrations of the use of PlanDefinition to describe services where the logic is not expressed in a computable and shareable way, only the inputs and outputs of the service are described. For these examples, the PlanDefinition/$apply operation can still be used, but the implementation of the service is not shareable.

#### GetDiagnoses

A service that returns a set of possible indications, given patient data.

##### Example Scenario

**Input:** Male 50yo, BMI=35, shortness of breath, chest pain that worsens with deep breathin, impaired kidney function
**Output:** Possible indications will be
* Pulmonary Embolism
* Acute Coronary Syndrome
* Pneumothorax

##### PlanDefinition

[GetDiagnoses](PlanDefinition-GetDiagnoses.html)

##### Request

$apply:

| Parameter | Value | Description |
|----|----|----|
|subject | Patient/X | A reference to a Patient resource created to provide the age and gender of the patient. This does not necessarily correspond to a Patient on the server or even an actual Patient, it is used to convey the information about the subject and provide a reference for the information provided to the service. |
|data | Bundle | Data provided to the service for evaluation. This example uses the single-bundle approach, but prefetch information can be used to specify more granular breakdowns of the input data to the service. |
|return | Bundle | Bundle containing a RequestGroup and the resulting propose-diagnosis tasks |

```http
POST [base]/PlanDefinition/GetDiagnoses/$apply
```

Body

```json
{
    "resourceType": "Parameters",
    "id": "input",
    "parameter": [
        {
            "name": "subject",
            "valueString": "Patient/X"
        },
        {
            "name": "data",
            "valueResource": {
                "resourceType": "Bundle",
                "id": "getdiagnoses-data",
                ...
            }
        }
    ]
}
```

[GetDiagnoses-Data](Bundle-getdiagnoses-data.html)

##### Response

```json
{
    "resourceType": "Parameters",
    "id": "output",
    "parameter": [
        {
            "name": "return",
            "valueResource": {
                "resourceType": "Bundle",
                "id": "getdiagnoses-return",
                ...
            }
        }
    ]
}
```

[GetDiagnoses-Return](Bundle-getdiagnoses-return.html)

#### GetDataToCollect

##### PlanDefinition

[GetDataToCollect](PlanDefinition-GetDataToCollect.html)

##### Request

$apply:

| Parameter | Value | Description |
|----|----|----|
|subject | Patient/X | A reference to a Patient resource created to provide the age and gender of the patient. This does not necessarily correspond to a Patient on the server or even an actual Patient, it is used to convey the information about the subject and provide a reference for the information provided to the service. |
|data | Bundle | Data provided to the service for evaluation. This example uses the single-bundle approach, but prefetch information can be used to specify more granular breakdowns of the input data to the service. |
|return | Bundle | Bundle containing a RequestGroup and the resulting collect-information task |

```http
POST [base]/PlanDefinition/GetDataToCollect/$apply
```

Body

```json
{
    "resourceType": "Parameters",
    "id": "input",
    "parameter": [
        {
            "name": "subject",
            "valueString": "Patient/Y"
        },
        {
            "name": "data",
            "valueResource": {
                "resourceType": "Bundle",
                "id": "getdatatocollect-data",
                ...
            }
        }
    ]
}
```

[GetDataToCollect-Data](Bundle-getdatatocollect-data.html)

##### Response

```json
{
    "resourceType": "Parameters",
    "id": "output",
    "parameter": [
        {
            "name": "return",
            "valueResource": {
                "resourceType": "Bundle",
                "id": "getdatatocollect-return",
                ...
            }
        }
    ]
}
```

[GetDataToCollect-Return](Bundle-getdatatocollect-return.html)

#### GetRecommendations

##### PlanDefinition

[GetRecommendations](PlanDefinition-GetRecommendations.html)

##### Request

$apply:

| Parameter | Value | Description |
|----|----|----|
|subject | Patient/X | A reference to a Patient resource created to provide the age and gender of the patient. This does not necessarily correspond to a Patient on the server or even an actual Patient, it is used to convey the information about the subject and provide a reference for the information provided to the service. |
|data | Bundle | Data provided to the service for evaluation. This example uses the single-bundle approach, but prefetch information can be used to specify more granular breakdowns of the input data to the service. |
|return | Bundle | Bundle containing a RequestGroup and the resulting proposed medications and orders |

```http
POST [base]/PlanDefinition/GetRecommendations/$apply
```

Body

```json
{
    "resourceType": "Parameters",
    "id": "input",
    "parameter": [
        {
            "name": "subject",
            "valueString": "Patient/X"
        },
        {
            "name": "data",
            "valueResource": {
                "resourceType": "Bundle",
                "id": "getrecommendations-data",
                ...
            }
        }
    ]
}
```

[GetRecommendations-Data](Bundle-getrecommendations-data.html)

##### Response

```json
{
    "resourceType": "Parameters",
    "id": "output",
    "parameter": [
        {
            "name": "return",
            "valueResource": {
                "resourceType": "Bundle",
                "id": "getrecommendations-return",
                ...
            }
        }
    ]
}
```

[GetRecommendations-Return](Bundle-getrecommendations-return.html)
