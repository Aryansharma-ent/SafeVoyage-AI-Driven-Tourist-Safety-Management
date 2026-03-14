import pandas as pd
import random

states = [
"Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
"Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand",
"Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur",
"Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
"Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura",
"Uttar Pradesh","Uttarakhand","West Bengal"
]

descriptions = [
"trekking route",
"forest trail",
"city tourism",
"mountain hiking",
"night travel",
"remote village visit",
"temple visit",
"desert safari"
]

rows = []

for i in range(10000):

    crime_rate = random.uniform(0,1)
    weather_risk = random.uniform(0,1)
    terrain_difficulty = random.uniform(0,1)
    tourist_density = random.uniform(0,1)
    time_of_day = random.choice([0,1])   # 0 day, 1 night

    risk_score = (
        crime_rate*30 +
        weather_risk*25 +
        terrain_difficulty*25 +
        tourist_density*10 +
        time_of_day*10
    )

    rows.append([
        random.choice(states),
        random.choice(descriptions),
        crime_rate,
        weather_risk,
        terrain_difficulty,
        tourist_density,
        time_of_day,
        risk_score
    ])

df = pd.DataFrame(rows, columns=[
"state",
"description",
"crime_rate",
"weather_risk",
"terrain_difficulty",
"tourist_density",
"time_of_day",
"risk_score"
])

df.to_csv("tourist_risk_dataset.csv", index=False)

print("Dataset Generated Successfully!")