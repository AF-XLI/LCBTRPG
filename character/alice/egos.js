{
  "jabberwock": {
    "rank": "ZAYIN",
    "name": "ジャバウォック",
    "sin": "gluttony",
    "type": "blunt",
    "base": 15,
    "coin": 5,
    "coins": 1,
    "weight": 3,
    "sp": 15,
    "cost": {
      "gluttony": 3,
      "envy": 2
    },
    "resist": {
      "lust": 2,
      "gloom": 2,
      "gluttony": 0.75
    },
    "effects": [
      {
        "coin": 1,
        "timing": "hit",
        "type": "gain",
        "status": "charge",
        "count": 6,
        "target": "self"
      },
      {
        "coin": 1,
        "timing": "hit",
        "type": "grant",
        "target": "self",
        "delay": "nextTurn",
        "status": "bind",
        "power": 2,
        "ifStatus": {
          "status": "charge",
          "op": "gte",
          "value": 10
        }
      },
      {
        "coin": 1,
        "timing": "hit",
        "type": "grant",
        "target": "self",
        "delay": "nextTurn",
        "status": "dmgUp",
        "power": 3,
        "ifStatus": {
          "status": "charge",
          "op": "gte",
          "value": 10
        }
      }
    ],
    "passive": {
      "effects": [
        {
          "type": "advanceThreshold",
          "skillType": "blunt",
          "amount": 3
        }
      ]
    }
  }
}
