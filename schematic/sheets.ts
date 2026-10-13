import type { SchematicBoxProps, SchematicSheetProps } from "@tscircuit/props"

/** These native TSX representations share the board's physical component and source ports. */
export const sheets: SchematicSheetProps[] = [
  {
    "name": "sheet_pd",
    "displayName": "Power input / USB-C PD and auxiliary JST",
    "sheetIndex": 0,
    "sheetWidth": 701.9636363636364,
    "sheetHeight": 554.1818181818181,
    "sheetSize": "ANSI_B"
  },
  {
    "name": "sheet_pmic",
    "displayName": "PMIC / regulated supplies",
    "sheetIndex": 1,
    "sheetWidth": 591.1272727272727,
    "sheetHeight": 517.2363636363636,
    "sheetSize": "ANSI_B"
  },
  {
    "name": "sheet_ddr",
    "displayName": "DDR3 / data and address interface",
    "sheetIndex": 2,
    "sheetWidth": 591.1272727272727,
    "sheetHeight": 443.3454545454546,
    "sheetSize": "ANSI_B"
  },
  {
    "name": "sheet_ddr_power",
    "displayName": "DDR3 / power, reference and termination",
    "sheetIndex": 3,
    "sheetWidth": 591.1272727272727,
    "sheetHeight": 535.709090909091,
    "sheetSize": "ANSI_B"
  },
  {
    "name": "schematic_sheet_cpu_power_core",
    "displayName": "Processor supplies • core and MPU",
    "sheetIndex": 4,
    "sheetWidth": 535.709090909091,
    "sheetHeight": 387.92727272727274,
    "sheetSize": "ANSI_B"
  },
  {
    "name": "schematic_sheet_cpu_power_io",
    "displayName": "Processor supplies • 3.3 V I/O and 1.8 V domains",
    "sheetIndex": 5,
    "sheetWidth": 535.709090909091,
    "sheetHeight": 387.92727272727274,
    "sheetSize": "ANSI_B"
  },
  {
    "name": "schematic_sheet_cpu_power_ground",
    "displayName": "Processor ground • every physical ball",
    "sheetIndex": 6,
    "sheetWidth": 406.4,
    "sheetHeight": 258.6181818181818,
    "sheetSize": "ANSI_B"
  },
  {
    "name": "schematic_sheet_cpu_power_aux",
    "displayName": "Processor supplies • DDR, RTC and USB analog",
    "sheetIndex": 7,
    "sheetWidth": 535.709090909091,
    "sheetHeight": 387.92727272727274,
    "sheetSize": "ANSI_B"
  },
  {
    "name": "sheet_clock_control",
    "displayName": "Clocks / reset / boot configuration",
    "sheetIndex": 8,
    "sheetWidth": 591.1272727272727,
    "sheetHeight": 443.3454545454546,
    "sheetSize": "ANSI_B"
  },
  {
    "name": "sheet_usb",
    "displayName": "Dual USB host ports",
    "sheetIndex": 9,
    "sheetWidth": 665.0181818181818,
    "sheetHeight": 554.1818181818181,
    "sheetSize": "ANSI_B"
  },
  {
    "name": "sheet_video",
    "displayName": "Video / RGB565 to TMDS",
    "sheetIndex": 10,
    "sheetWidth": 701.9636363636364,
    "sheetHeight": 480.2909090909091,
    "sheetSize": "ANSI_B"
  },
  {
    "name": "sheet_hdmi",
    "displayName": "HDMI / connector and protection",
    "sheetIndex": 11,
    "sheetWidth": 665.0181818181818,
    "sheetHeight": 461.8181818181818,
    "sheetSize": "ANSI_B"
  },
  {
    "name": "sheet_io",
    "displayName": "microSD / UART / ARM20 JTAG",
    "sheetIndex": 12,
    "sheetWidth": 775.8545454545455,
    "sheetHeight": 609.6,
    "sheetSize": "ANSI_B"
  },
  {
    "name": "sheet_indicators",
    "displayName": "RGB indicators / buzzer",
    "sheetIndex": 13,
    "sheetWidth": 628.0727272727273,
    "sheetHeight": 369.45454545454544,
    "sheetSize": "ANSI_B"
  },
  {
    "name": "sheet_unused",
    "displayName": "Processor / unused and reserved balls",
    "sheetIndex": 14,
    "sheetWidth": 665.0181818181818,
    "sheetHeight": 332.5090909090909,
    "sheetSize": "ANSI_B"
  }
]

export const pinBanks: SchematicBoxProps[] = [
  {
    "name": "U2 · supply generation",
    "chipRef": "chip.U2",
    "schSheetName": "sheet_pmic",
    "schX": -19,
    "schY": 8,
    "width": 12,
    "height": 12,
    "pinLabels": {
      "pin1": [
        "VLDO2",
        "pin1"
      ],
      "pin19": [
        "VDCDC1",
        "pin19"
      ],
      "pin12": [
        "USB",
        "pin12"
      ],
      "pin30": [
        "PGND",
        "pin30"
      ],
      "pin41": [
        "AGND",
        "pin41"
      ],
      "pin49": [
        "EP",
        "pin49"
      ],
      "pin28": [
        "SCL",
        "pin28"
      ],
      "pin27": [
        "SDA",
        "pin27"
      ],
      "pin47": [
        "BYPASS",
        "pin47"
      ],
      "pin48": [
        "INT_LDO",
        "pin48"
      ],
      "pin25": [
        "PB_IN",
        "pin25"
      ],
      "pin9": [
        "PWR_EN",
        "pin9"
      ],
      "pin11": [
        "TS",
        "pin11"
      ],
      "pin26": [
        "PGOOD",
        "pin26"
      ],
      "pin3": [
        "VLDO1",
        "pin3"
      ],
      "pin44": [
        "nRESET",
        "pin44"
      ],
      "pin20": [
        "L1",
        "pin20"
      ],
      "pin23": [
        "L2",
        "pin23"
      ],
      "pin31": [
        "L3",
        "pin31"
      ],
      "pin2": [
        "VINLDO",
        "pin2"
      ],
      "pin7": [
        "SYS1",
        "pin7"
      ],
      "pin8": [
        "SYS2",
        "pin8"
      ],
      "pin21": [
        "VIN_DCDC1",
        "pin21"
      ],
      "pin22": [
        "VIN_DCDC2",
        "pin22"
      ],
      "pin32": [
        "VIN_DCDC3",
        "pin32"
      ],
      "pin39": [
        "LS1_IN",
        "pin39"
      ],
      "pin42": [
        "LS2_IN",
        "pin42"
      ],
      "pin40": [
        "LS1_OUT",
        "pin40"
      ],
      "pin18": [
        "VIO",
        "pin18"
      ],
      "pin43": [
        "LS2_OUT",
        "pin43"
      ],
      "pin29": [
        "VDCDC3",
        "pin29"
      ],
      "pin24": [
        "VDCDC2",
        "pin24"
      ],
      "pin10": [
        "AC",
        "pin10"
      ]
    },
    "schPinArrangement": {
      "leftSide": {
        "pins": [
          1,
          19,
          12,
          30,
          41,
          49,
          28,
          27,
          47,
          48,
          25,
          9,
          11,
          26,
          3,
          44,
          20
        ],
        "direction": "top-to-bottom"
      },
      "rightSide": {
        "pins": [
          23,
          31,
          2,
          7,
          8,
          21,
          22,
          32,
          39,
          42,
          40,
          18,
          43,
          29,
          24,
          10
        ],
        "direction": "top-to-bottom"
      }
    },
    "schPinStyle": {
      "pin1": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin19": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin12": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin30": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin41": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin49": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin28": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin27": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin47": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin48": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin25": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin9": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin11": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin26": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin3": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin44": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin20": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin23": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin31": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin2": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin7": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin8": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin21": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin22": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin32": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin39": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin42": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin40": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin18": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin43": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin29": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin24": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin10": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  {
    "name": "U2 · unused functions",
    "chipRef": "chip.U2",
    "schSheetName": "sheet_pmic",
    "schX": 20,
    "schY": 10,
    "width": 10,
    "height": 6.15,
    "pinLabels": {
      "pin6": [
        "BAT_SENSE",
        "pin6"
      ],
      "pin4": [
        "BAT1",
        "pin4"
      ],
      "pin5": [
        "BAT2",
        "pin5"
      ],
      "pin38": [
        "FB_WLED",
        "pin38"
      ],
      "pin35": [
        "ISET1",
        "pin35"
      ],
      "pin36": [
        "ISET2",
        "pin36"
      ],
      "pin34": [
        "ISINK1",
        "pin34"
      ],
      "pin33": [
        "ISINK2",
        "pin33"
      ],
      "pin37": [
        "L4",
        "pin37"
      ],
      "pin46": [
        "LDO_PGOOD",
        "pin46"
      ],
      "pin14": [
        "MUX_IN",
        "pin14"
      ],
      "pin16": [
        "MUX_OUT",
        "pin16"
      ],
      "pin15": [
        "NC1",
        "pin15"
      ],
      "pin17": [
        "NC2",
        "pin17"
      ],
      "pin45": [
        "nINT",
        "pin45"
      ],
      "pin13": [
        "nWAKEUP",
        "pin13"
      ]
    },
    "schPinArrangement": {
      "leftSide": {
        "pins": [
          6,
          4,
          5,
          38,
          35,
          36,
          34,
          33
        ],
        "direction": "top-to-bottom"
      },
      "rightSide": {
        "pins": [
          37,
          46,
          14,
          16,
          15,
          17,
          45,
          13
        ],
        "direction": "top-to-bottom"
      }
    },
    "schPinStyle": {
      "pin6": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin4": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin5": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin38": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin35": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin36": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin34": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin33": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin37": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin46": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin14": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin16": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin15": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin17": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin45": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin13": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  {
    "name": "U1 · DDR data",
    "chipRef": "chip.U1",
    "schSheetName": "sheet_ddr",
    "schX": -20,
    "schY": 12,
    "width": 8,
    "height": 15.25,
    "pinLabels": {
      "pin48": [
        "DDR_D0_M3",
        "M3",
        "pin48"
      ],
      "pin66": [
        "DDR_D1_M4",
        "M4",
        "pin66"
      ],
      "pin13": [
        "DDR_D2_N1",
        "N1",
        "pin13"
      ],
      "pin31": [
        "DDR_D3_N2",
        "N2",
        "pin31"
      ],
      "pin49": [
        "DDR_D4_N3",
        "N3",
        "pin49"
      ],
      "pin67": [
        "DDR_D5_N4",
        "N4",
        "pin67"
      ],
      "pin50": [
        "DDR_D6_P3",
        "P3",
        "pin50"
      ],
      "pin68": [
        "DDR_D7_P4",
        "P4",
        "pin68"
      ],
      "pin9": [
        "DDR_D8_J1",
        "J1",
        "pin9"
      ],
      "pin10": [
        "DDR_D9_K1",
        "K1",
        "pin10"
      ],
      "pin28": [
        "DDR_D10_K2",
        "K2",
        "pin28"
      ],
      "pin46": [
        "DDR_D11_K3",
        "K3",
        "pin46"
      ],
      "pin64": [
        "DDR_D12_K4",
        "K4",
        "pin64"
      ],
      "pin47": [
        "DDR_D13_L3",
        "L3",
        "pin47"
      ],
      "pin65": [
        "DDR_D14_L4",
        "L4",
        "pin65"
      ],
      "pin12": [
        "DDR_D15_M1",
        "M1",
        "pin12"
      ],
      "pin30": [
        "DDR_DQM0_M2",
        "M2",
        "pin30"
      ],
      "pin27": [
        "DDR_DQM1_J2",
        "J2",
        "pin27"
      ],
      "pin14": [
        "DDR_DQS0_P1",
        "P1",
        "pin14"
      ],
      "pin11": [
        "DDR_DQS1_L1",
        "L1",
        "pin11"
      ],
      "pin32": [
        "DDR_DQSn0_P2",
        "P2",
        "pin32"
      ],
      "pin29": [
        "DDR_DQSn1_L2",
        "L2",
        "pin29"
      ]
    },
    "schPinArrangement": {
      "rightSide": {
        "pins": [
          48,
          66,
          13,
          31,
          49,
          67,
          50,
          68,
          9,
          10,
          28,
          46,
          64,
          47,
          65,
          12,
          30,
          27,
          14,
          11,
          32,
          29
        ],
        "direction": "top-to-bottom"
      }
    },
    "schPinStyle": {
      "pin48": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin66": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin13": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin31": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin49": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin67": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin50": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin68": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin9": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin10": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin28": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin46": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin64": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin47": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin65": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin12": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin30": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin27": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin14": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin11": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin32": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin29": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  {
    "name": "U1 · DDR address / control",
    "chipRef": "chip.U1",
    "schSheetName": "sheet_ddr",
    "schX": -20,
    "schY": -9,
    "width": 8,
    "height": 18.500000000000004,
    "pinLabels": {
      "pin42": [
        "DDR_A0_F3",
        "F3",
        "pin42"
      ],
      "pin8": [
        "DDR_A1_H1",
        "H1",
        "pin8"
      ],
      "pin59": [
        "DDR_A2_E4",
        "E4",
        "pin59"
      ],
      "pin39": [
        "DDR_A3_C3",
        "C3",
        "pin39"
      ],
      "pin21": [
        "DDR_A4_C2",
        "C2",
        "pin21"
      ],
      "pin2": [
        "DDR_A5_B1",
        "B1",
        "pin2"
      ],
      "pin76": [
        "DDR_A6_D5",
        "D5",
        "pin76"
      ],
      "pin23": [
        "DDR_A7_E2",
        "E2",
        "pin23"
      ],
      "pin58": [
        "DDR_A8_D4",
        "D4",
        "pin58"
      ],
      "pin3": [
        "DDR_A9_C1",
        "C1",
        "pin3"
      ],
      "pin60": [
        "DDR_A10_F4",
        "F4",
        "pin60"
      ],
      "pin24": [
        "DDR_A11_F2",
        "F2",
        "pin24"
      ],
      "pin41": [
        "DDR_A12_E3",
        "E3",
        "pin41"
      ],
      "pin57": [
        "DDR_BA0_C4",
        "C4",
        "pin57"
      ],
      "pin5": [
        "DDR_BA1_E1",
        "E1",
        "pin5"
      ],
      "pin38": [
        "DDR_BA2_B3",
        "B3",
        "pin38"
      ],
      "pin6": [
        "DDR_CASn_F1",
        "F1",
        "pin6"
      ],
      "pin22": [
        "DDR_CK_D2",
        "D2",
        "pin22"
      ],
      "pin43": [
        "DDR_CKE_G3",
        "G3",
        "pin43"
      ],
      "pin4": [
        "DDR_CKn_D1",
        "D1",
        "pin4"
      ],
      "pin26": [
        "DDR_CSn0_H2",
        "H2",
        "pin26"
      ],
      "pin7": [
        "DDR_ODT_G1",
        "G1",
        "pin7"
      ],
      "pin61": [
        "DDR_RASn_G4",
        "G4",
        "pin61"
      ],
      "pin25": [
        "DDR_RESETn_G2",
        "G2",
        "pin25"
      ],
      "pin63": [
        "DDR_VREF_J4",
        "J4",
        "pin63"
      ],
      "pin45": [
        "DDR_VTP_J3",
        "J3",
        "pin45"
      ],
      "pin20": [
        "DDR_WEn_B2",
        "B2",
        "pin20"
      ]
    },
    "schPinArrangement": {
      "rightSide": {
        "pins": [
          42,
          8,
          59,
          39,
          21,
          2,
          76,
          23,
          58,
          3,
          60,
          24,
          41,
          57,
          5,
          38,
          6,
          22,
          43,
          4,
          26,
          7,
          61,
          25,
          63,
          45,
          20
        ],
        "direction": "top-to-bottom"
      }
    },
    "schPinStyle": {
      "pin42": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin8": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin59": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin39": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin21": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin2": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin76": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin23": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin58": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin3": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin60": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin24": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin41": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin57": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin5": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin38": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin6": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin22": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin43": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin4": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin26": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin7": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin61": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin25": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin63": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin45": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin20": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  {
    "name": "U1 · core supply",
    "chipRef": "chip.U1",
    "schSheetName": "schematic_sheet_cpu_power_core",
    "schX": -19.5,
    "schY": 8,
    "width": 10,
    "height": 7.4,
    "pinLabels": {
      "pin96": [
        "VDD_CORE_F6",
        "F6",
        "pin96"
      ],
      "pin97": [
        "VDD_CORE_G6",
        "G6",
        "pin97"
      ],
      "pin100": [
        "VDD_CORE_K6",
        "K6",
        "pin100"
      ],
      "pin101": [
        "VDD_CORE_L6",
        "L6",
        "pin101"
      ],
      "pin114": [
        "VDD_CORE_F7",
        "F7",
        "pin114"
      ],
      "pin115": [
        "VDD_CORE_G7",
        "G7",
        "pin115"
      ],
      "pin119": [
        "VDD_CORE_L7",
        "L7",
        "pin119"
      ],
      "pin136": [
        "VDD_CORE_K8",
        "K8",
        "pin136"
      ],
      "pin137": [
        "VDD_CORE_L8",
        "L8",
        "pin137"
      ],
      "pin139": [
        "VDD_CORE_N8",
        "N8",
        "pin139"
      ],
      "pin155": [
        "VDD_CORE_L9",
        "L9",
        "pin155"
      ],
      "pin157": [
        "VDD_CORE_N9",
        "N9",
        "pin157"
      ],
      "pin169": [
        "VDD_CORE_G10",
        "G10",
        "pin169"
      ],
      "pin188": [
        "VDD_CORE_H11",
        "H11",
        "pin188"
      ],
      "pin192": [
        "VDD_CORE_M11",
        "M11",
        "pin192"
      ],
      "pin207": [
        "VDD_CORE_J12",
        "J12",
        "pin207"
      ],
      "pin208": [
        "VDD_CORE_K12",
        "K12",
        "pin208"
      ],
      "pin211": [
        "VDD_CORE_N12",
        "N12",
        "pin211"
      ],
      "pin228": [
        "VDD_CORE_M13",
        "M13",
        "pin228"
      ],
      "pin229": [
        "VDD_CORE_N13",
        "N13",
        "pin229"
      ]
    },
    "schPinArrangement": {
      "leftSide": {
        "pins": [
          96,
          97,
          100,
          101,
          114,
          115,
          119,
          136,
          137,
          139
        ],
        "direction": "top-to-bottom"
      },
      "rightSide": {
        "pins": [
          155,
          157,
          169,
          188,
          192,
          207,
          208,
          211,
          228,
          229
        ],
        "direction": "top-to-bottom"
      }
    },
    "schPinStyle": {
      "pin96": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin97": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin100": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin101": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin114": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin115": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin119": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin136": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin137": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin139": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin155": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin157": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin169": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin188": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin192": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin207": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin208": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin211": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin228": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin229": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  {
    "name": "U1 · MPU supply / monitor",
    "chipRef": "chip.U1",
    "schSheetName": "schematic_sheet_cpu_power_core",
    "schX": -19.5,
    "schY": -10,
    "width": 10,
    "height": 3.5,
    "pinLabels": {
      "pin19": [
        "VDD_MPU_MON_A2",
        "A2",
        "pin19"
      ],
      "pin168": [
        "VDD_MPU_F10",
        "F10",
        "pin168"
      ],
      "pin186": [
        "VDD_MPU_F11",
        "F11",
        "pin186"
      ],
      "pin204": [
        "VDD_MPU_F12",
        "F12",
        "pin204"
      ],
      "pin222": [
        "VDD_MPU_F13",
        "F13",
        "pin222"
      ],
      "pin223": [
        "VDD_MPU_G13",
        "G13",
        "pin223"
      ],
      "pin224": [
        "VDD_MPU_H13",
        "H13",
        "pin224"
      ],
      "pin225": [
        "VDD_MPU_J13",
        "J13",
        "pin225"
      ]
    },
    "schPinArrangement": {
      "leftSide": {
        "pins": [
          19,
          168,
          186,
          204
        ],
        "direction": "top-to-bottom"
      },
      "rightSide": {
        "pins": [
          222,
          223,
          224,
          225
        ],
        "direction": "top-to-bottom"
      }
    },
    "schPinStyle": {
      "pin19": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin168": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin186": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin204": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin222": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin223": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin224": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin225": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  {
    "name": "U1 · 3.3 V I/O domains",
    "chipRef": "chip.U1",
    "schSheetName": "schematic_sheet_cpu_power_io",
    "schX": -19.5,
    "schY": 9,
    "width": 10,
    "height": 7.4,
    "pinLabels": {
      "pin85": [
        "VDDSHV6_N5",
        "N5",
        "pin85"
      ],
      "pin86": [
        "VDDSHV6_P5",
        "P5",
        "pin86"
      ],
      "pin104": [
        "VDDSHV6_P6",
        "P6",
        "pin104"
      ],
      "pin122": [
        "VDDSHV1_P7",
        "P7",
        "pin122"
      ],
      "pin140": [
        "VDDSHV1_P8",
        "P8",
        "pin140"
      ],
      "pin167": [
        "VDDSHV6_E10",
        "E10",
        "pin167"
      ],
      "pin176": [
        "VDDSHV2_P10",
        "P10",
        "pin176"
      ],
      "pin185": [
        "VDDSHV6_E11",
        "E11",
        "pin185"
      ],
      "pin194": [
        "VDDSHV2_P11",
        "P11",
        "pin194"
      ],
      "pin203": [
        "VDDSHV6_E12",
        "E12",
        "pin203"
      ],
      "pin212": [
        "VDDSHV3_P12",
        "P12",
        "pin212"
      ],
      "pin221": [
        "VDDSHV6_E13",
        "E13",
        "pin221"
      ],
      "pin230": [
        "VDDSHV3_P13",
        "P13",
        "pin230"
      ],
      "pin240": [
        "VDDSHV6_F14",
        "F14",
        "pin240"
      ],
      "pin241": [
        "VDDSHV6_G14",
        "G14",
        "pin241"
      ],
      "pin242": [
        "VDDSHV4_H14",
        "H14",
        "pin242"
      ],
      "pin243": [
        "VDDSHV4_J14",
        "J14",
        "pin243"
      ],
      "pin244": [
        "VDDSHV5_K14",
        "K14",
        "pin244"
      ],
      "pin245": [
        "VDDSHV5_L14",
        "L14",
        "pin245"
      ]
    },
    "schPinArrangement": {
      "leftSide": {
        "pins": [
          85,
          86,
          104,
          122,
          140,
          167,
          176,
          185,
          194,
          203
        ],
        "direction": "top-to-bottom"
      },
      "rightSide": {
        "pins": [
          212,
          221,
          230,
          240,
          241,
          242,
          243,
          244,
          245
        ],
        "direction": "top-to-bottom"
      }
    },
    "schPinStyle": {
      "pin85": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin86": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin104": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin122": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin140": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin167": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin176": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin185": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin194": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin203": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin212": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin221": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin230": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin240": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin241": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin242": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin243": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin244": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin245": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  {
    "name": "U1 · 1.8 V digital / analog",
    "chipRef": "chip.U1",
    "schSheetName": "schematic_sheet_cpu_power_io",
    "schX": -19.5,
    "schY": -9,
    "width": 10,
    "height": 6.750000000000001,
    "pinLabels": {
      "pin95": [
        "VDDS_E6",
        "E6",
        "pin95"
      ],
      "pin103": [
        "VDDS_N6",
        "N6",
        "pin103"
      ],
      "pin113": [
        "VDDS_PLL_DDR_E7",
        "E7",
        "pin113"
      ],
      "pin130": [
        "VDDA_ADC_D8",
        "D8",
        "pin130"
      ],
      "pin146": [
        "VREFP_B9",
        "B9",
        "pin146"
      ],
      "pin149": [
        "VDDS_SRAM_CORE_BG_E9",
        "E9",
        "pin149"
      ],
      "pin150": [
        "VDDS_F9",
        "F9",
        "pin150"
      ],
      "pin158": [
        "VDDS_P9",
        "P9",
        "pin158"
      ],
      "pin166": [
        "VDDS_SRAM_MPU_BB_D10",
        "D10",
        "pin166"
      ],
      "pin177": [
        "VDDS_PLL_CORE_LCD_R10",
        "R10",
        "pin177"
      ],
      "pin195": [
        "VDDS_OSC_R11",
        "R11",
        "pin195"
      ],
      "pin226": [
        "VDDS_K13",
        "K13",
        "pin226"
      ],
      "pin239": [
        "VDDS_E14",
        "E14",
        "pin239"
      ],
      "pin248": [
        "VDDS_P14",
        "P14",
        "pin248"
      ],
      "pin260": [
        "VDDS_PLL_MPU_H15",
        "H15",
        "pin260"
      ],
      "pin283": [
        "VDDA1P8V_USB0_N16",
        "N16",
        "pin283"
      ],
      "pin285": [
        "VDDA1P8V_USB1_R16",
        "R16",
        "pin285"
      ]
    },
    "schPinArrangement": {
      "leftSide": {
        "pins": [
          95,
          103,
          113,
          130,
          146,
          149,
          150,
          158,
          166
        ],
        "direction": "top-to-bottom"
      },
      "rightSide": {
        "pins": [
          177,
          195,
          226,
          239,
          248,
          260,
          283,
          285
        ],
        "direction": "top-to-bottom"
      }
    },
    "schPinStyle": {
      "pin95": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin103": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin113": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin130": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin146": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin149": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin150": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin158": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin166": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin177": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin195": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin226": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin239": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin248": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin260": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin283": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin285": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  {
    "name": "U1 · ground terminals A",
    "chipRef": "chip.U1",
    "schSheetName": "schematic_sheet_cpu_power_ground",
    "schX": -10,
    "schY": 1,
    "width": 10,
    "height": 8.700000000000001,
    "pinLabels": {
      "pin1": [
        "VSS_A1",
        "A1",
        "pin1"
      ],
      "pin18": [
        "VSS_V1",
        "V1",
        "pin18"
      ],
      "pin56": [
        "RTC_KALDO_ENn_B4",
        "B4",
        "pin56"
      ],
      "pin73": [
        "VSS_RTC_A5",
        "A5",
        "pin73"
      ],
      "pin84": [
        "VPP_M5",
        "M5",
        "pin84"
      ],
      "pin98": [
        "VSS_H6",
        "H6",
        "pin98"
      ],
      "pin99": [
        "VSS_J6",
        "J6",
        "pin99"
      ],
      "pin102": [
        "VSS_M6",
        "M6",
        "pin102"
      ],
      "pin116": [
        "VSS_H7",
        "H7",
        "pin116"
      ],
      "pin117": [
        "VSS_J7",
        "J7",
        "pin117"
      ],
      "pin118": [
        "VSS_K7",
        "K7",
        "pin118"
      ],
      "pin120": [
        "VSS_M7",
        "M7",
        "pin120"
      ],
      "pin121": [
        "VSS_N7",
        "N7",
        "pin121"
      ],
      "pin131": [
        "VSSA_ADC_E8",
        "E8",
        "pin131"
      ],
      "pin132": [
        "VSS_F8",
        "F8",
        "pin132"
      ],
      "pin133": [
        "VSS_G8",
        "G8",
        "pin133"
      ],
      "pin134": [
        "VSS_H8",
        "H8",
        "pin134"
      ],
      "pin135": [
        "VSS_J8",
        "J8",
        "pin135"
      ],
      "pin138": [
        "VSS_M8",
        "M8",
        "pin138"
      ],
      "pin145": [
        "VREFN_A9",
        "A9",
        "pin145"
      ],
      "pin151": [
        "VSS_G9",
        "G9",
        "pin151"
      ],
      "pin152": [
        "VSS_H9",
        "H9",
        "pin152"
      ],
      "pin153": [
        "VSS_J9",
        "J9",
        "pin153"
      ]
    },
    "schPinArrangement": {
      "leftSide": {
        "pins": [
          1,
          18,
          56,
          73,
          84,
          98,
          99,
          102,
          116,
          117,
          118,
          120
        ],
        "direction": "top-to-bottom"
      },
      "rightSide": {
        "pins": [
          121,
          131,
          132,
          133,
          134,
          135,
          138,
          145,
          151,
          152,
          153
        ],
        "direction": "top-to-bottom"
      }
    },
    "schPinStyle": {
      "pin1": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin18": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin56": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin73": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin84": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin98": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin99": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin102": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin116": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin117": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin118": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin120": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin121": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin131": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin132": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin133": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin134": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin135": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin138": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin145": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin151": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin152": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin153": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  {
    "name": "U1 · ground terminals B",
    "chipRef": "chip.U1",
    "schSheetName": "schematic_sheet_cpu_power_ground",
    "schX": 10,
    "schY": 1,
    "width": 10,
    "height": 8.700000000000001,
    "pinLabels": {
      "pin154": [
        "VSS_K9",
        "K9",
        "pin154"
      ],
      "pin156": [
        "VSS_M9",
        "M9",
        "pin156"
      ],
      "pin170": [
        "VSS_H10",
        "H10",
        "pin170"
      ],
      "pin171": [
        "VSS_J10",
        "J10",
        "pin171"
      ],
      "pin172": [
        "VSS_K10",
        "K10",
        "pin172"
      ],
      "pin173": [
        "VSS_L10",
        "L10",
        "pin173"
      ],
      "pin174": [
        "VSS_M10",
        "M10",
        "pin174"
      ],
      "pin175": [
        "VSS_N10",
        "N10",
        "pin175"
      ],
      "pin187": [
        "VSS_G11",
        "G11",
        "pin187"
      ],
      "pin189": [
        "VSS_J11",
        "J11",
        "pin189"
      ],
      "pin190": [
        "VSS_K11",
        "K11",
        "pin190"
      ],
      "pin191": [
        "VSS_L11",
        "L11",
        "pin191"
      ],
      "pin193": [
        "VSS_N11",
        "N11",
        "pin193"
      ],
      "pin198": [
        "VSS_OSC_V11",
        "V11",
        "pin198"
      ],
      "pin205": [
        "VSS_G12",
        "G12",
        "pin205"
      ],
      "pin206": [
        "VSS_H12",
        "H12",
        "pin206"
      ],
      "pin209": [
        "VSS_L12",
        "L12",
        "pin209"
      ],
      "pin210": [
        "VSS_M12",
        "M12",
        "pin210"
      ],
      "pin227": [
        "VSS_L13",
        "L13",
        "pin227"
      ],
      "pin246": [
        "VSSA_USB_M14",
        "M14",
        "pin246"
      ],
      "pin247": [
        "VSSA_USB_N14",
        "N14",
        "pin247"
      ],
      "pin307": [
        "VSS_A18",
        "A18",
        "pin307"
      ],
      "pin324": [
        "VSS_V18",
        "V18",
        "pin324"
      ]
    },
    "schPinArrangement": {
      "leftSide": {
        "pins": [
          154,
          156,
          170,
          171,
          172,
          173,
          174,
          175,
          187,
          189,
          190,
          191
        ],
        "direction": "top-to-bottom"
      },
      "rightSide": {
        "pins": [
          193,
          198,
          205,
          206,
          209,
          210,
          227,
          246,
          247,
          307,
          324
        ],
        "direction": "top-to-bottom"
      }
    },
    "schPinStyle": {
      "pin154": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin156": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin170": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin171": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin172": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin173": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin174": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin175": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin187": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin189": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin190": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin191": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin193": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin198": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin205": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin206": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin209": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin210": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin227": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin246": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin247": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin307": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin324": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  {
    "name": "U1 · DDR I/O supply",
    "chipRef": "chip.U1",
    "schSheetName": "schematic_sheet_cpu_power_aux",
    "schX": -17.5,
    "schY": 10,
    "width": 10,
    "height": 3.5,
    "pinLabels": {
      "pin77": [
        "VDDS_DDR_E5",
        "E5",
        "pin77"
      ],
      "pin78": [
        "VDDS_DDR_F5",
        "F5",
        "pin78"
      ],
      "pin79": [
        "VDDS_DDR_G5",
        "G5",
        "pin79"
      ],
      "pin80": [
        "VDDS_DDR_H5",
        "H5",
        "pin80"
      ],
      "pin81": [
        "VDDS_DDR_J5",
        "J5",
        "pin81"
      ],
      "pin82": [
        "VDDS_DDR_K5",
        "K5",
        "pin82"
      ],
      "pin83": [
        "VDDS_DDR_L5",
        "L5",
        "pin83"
      ]
    },
    "schPinArrangement": {
      "leftSide": {
        "pins": [
          77,
          78,
          79,
          80
        ],
        "direction": "top-to-bottom"
      },
      "rightSide": {
        "pins": [
          81,
          82,
          83
        ],
        "direction": "top-to-bottom"
      }
    },
    "schPinStyle": {
      "pin77": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin78": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin79": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin80": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin81": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin82": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin83": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  {
    "name": "U1 · RTC / USB analog supplies",
    "chipRef": "chip.U1",
    "schSheetName": "schematic_sheet_cpu_power_aux",
    "schX": -17.5,
    "schY": 0,
    "width": 10,
    "height": 3,
    "pinLabels": {
      "pin112": [
        "VDDS_RTC_D7",
        "D7",
        "pin112"
      ],
      "pin265": [
        "VDDA3P3V_USB0_N15",
        "N15",
        "pin265"
      ],
      "pin267": [
        "VDDA3P3V_USB1_R15",
        "R15",
        "pin267"
      ]
    },
    "schPinArrangement": {
      "leftSide": {
        "pins": [
          112,
          265
        ],
        "direction": "top-to-bottom"
      },
      "rightSide": {
        "pins": [
          267
        ],
        "direction": "top-to-bottom"
      }
    },
    "schPinStyle": {
      "pin112": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin265": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin267": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  {
    "name": "U1 · internal regulator capacitors",
    "chipRef": "chip.U1",
    "schSheetName": "schematic_sheet_cpu_power_aux",
    "schX": -17.5,
    "schY": -9,
    "width": 10,
    "height": 3,
    "pinLabels": {
      "pin94": [
        "CAP_VDD_RTC_D6",
        "D6",
        "pin94"
      ],
      "pin148": [
        "CAP_VDD_SRAM_CORE_D9",
        "D9",
        "pin148"
      ],
      "pin165": [
        "CAP_VBB_MPU_C10",
        "C10",
        "pin165"
      ],
      "pin184": [
        "CAP_VDD_SRAM_MPU_D11",
        "D11",
        "pin184"
      ]
    },
    "schPinArrangement": {
      "leftSide": {
        "pins": [
          94,
          148
        ],
        "direction": "top-to-bottom"
      },
      "rightSide": {
        "pins": [
          165,
          184
        ],
        "direction": "top-to-bottom"
      }
    },
    "schPinStyle": {
      "pin94": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin148": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin165": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin184": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  {
    "name": "U1 · clocks / system control",
    "chipRef": "chip.U1",
    "schSheetName": "sheet_clock_control",
    "schX": -19,
    "schY": 14,
    "width": 11,
    "height": 4.2,
    "pinLabels": {
      "pin273": [
        "I2C0_SCL_C16",
        "C16",
        "pin273"
      ],
      "pin291": [
        "I2C0_SDA_C17",
        "C17",
        "pin291"
      ],
      "pin93": [
        "PMIC_POWER_EN_C6",
        "C6",
        "pin93"
      ],
      "pin254": [
        "PWRONRSTn_B15",
        "B15",
        "pin254"
      ],
      "pin74": [
        "RTC_PWRONRSTn_B5",
        "B5",
        "pin74"
      ],
      "pin91": [
        "RTC_XTALIN_A6",
        "A6",
        "pin91"
      ],
      "pin55": [
        "RTC_XTALOUT_A4",
        "A4",
        "pin55"
      ],
      "pin163": [
        "WARMRSTn_A10",
        "A10",
        "pin163"
      ],
      "pin180": [
        "XTALIN_V10",
        "V10",
        "pin180"
      ],
      "pin197": [
        "XTALOUT_U11",
        "U11",
        "pin197"
      ]
    },
    "schPinArrangement": {
      "leftSide": {
        "pins": [
          273,
          291,
          93,
          254,
          74
        ],
        "direction": "top-to-bottom"
      },
      "rightSide": {
        "pins": [
          91,
          55,
          163,
          180,
          197
        ],
        "direction": "top-to-bottom"
      }
    },
    "schPinStyle": {
      "pin273": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin291": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin93": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin254": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin74": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin91": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin55": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin163": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin180": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin197": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  {
    "name": "U1 · USB hosts",
    "chipRef": "chip.U1",
    "schSheetName": "sheet_usb",
    "schX": -24,
    "schY": 12,
    "width": 9,
    "height": 4.85,
    "pinLabels": {
      "pin284": [
        "USB0_ID_P16",
        "P16",
        "pin284"
      ],
      "pin302": [
        "USB1_ID_P17",
        "P17",
        "pin302"
      ],
      "pin319": [
        "USB0_DM_N18",
        "N18",
        "pin319"
      ],
      "pin301": [
        "USB0_DP_N17",
        "N17",
        "pin301"
      ],
      "pin276": [
        "USB0_DRVVBUS_F16",
        "F16",
        "pin276"
      ],
      "pin250": [
        "GPMC_A3_T14",
        "T14",
        "pin250"
      ],
      "pin266": [
        "USB0_VBUS_P15",
        "P15",
        "pin266"
      ],
      "pin321": [
        "USB1_DM_R18",
        "R18",
        "pin321"
      ],
      "pin303": [
        "USB1_DP_R17",
        "R17",
        "pin303"
      ],
      "pin258": [
        "USB1_DRVVBUS_F15",
        "F15",
        "pin258"
      ],
      "pin306": [
        "GPMC_A11_V17",
        "V17",
        "pin306"
      ],
      "pin322": [
        "USB1_VBUS_T18",
        "T18",
        "pin322"
      ]
    },
    "schPinArrangement": {
      "leftSide": {
        "pins": [
          284,
          302,
          319,
          301,
          276,
          250
        ],
        "direction": "top-to-bottom"
      },
      "rightSide": {
        "pins": [
          266,
          321,
          303,
          258,
          306,
          322
        ],
        "direction": "top-to-bottom"
      }
    },
    "schPinStyle": {
      "pin284": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin302": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin319": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin301": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin276": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin250": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin266": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin321": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin303": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin258": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin306": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin322": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  {
    "name": "U1 · LCD / video",
    "chipRef": "chip.U1",
    "schSheetName": "sheet_video",
    "schX": -23,
    "schY": 14,
    "width": 11,
    "height": 8.1,
    "pinLabels": {
      "pin231": [
        "GPMC_A0_R13",
        "R13",
        "pin231"
      ],
      "pin105": [
        "LCD_AC_BIAS_EN_R6",
        "R6",
        "pin105"
      ],
      "pin15": [
        "LCD_DATA0_R1",
        "R1",
        "pin15"
      ],
      "pin33": [
        "LCD_DATA1_R2",
        "R2",
        "pin33"
      ],
      "pin51": [
        "LCD_DATA2_R3",
        "R3",
        "pin51"
      ],
      "pin69": [
        "LCD_DATA3_R4",
        "R4",
        "pin69"
      ],
      "pin16": [
        "LCD_DATA4_T1",
        "T1",
        "pin16"
      ],
      "pin34": [
        "LCD_DATA5_T2",
        "T2",
        "pin34"
      ],
      "pin52": [
        "LCD_DATA6_T3",
        "T3",
        "pin52"
      ],
      "pin70": [
        "LCD_DATA7_T4",
        "T4",
        "pin70"
      ],
      "pin17": [
        "LCD_DATA8_U1",
        "U1",
        "pin17"
      ],
      "pin35": [
        "LCD_DATA9_U2",
        "U2",
        "pin35"
      ],
      "pin53": [
        "LCD_DATA10_U3",
        "U3",
        "pin53"
      ],
      "pin71": [
        "LCD_DATA11_U4",
        "U4",
        "pin71"
      ],
      "pin36": [
        "LCD_DATA12_V2",
        "V2",
        "pin36"
      ],
      "pin54": [
        "LCD_DATA13_V3",
        "V3",
        "pin54"
      ],
      "pin72": [
        "LCD_DATA14_V4",
        "V4",
        "pin72"
      ],
      "pin88": [
        "LCD_DATA15_T5",
        "T5",
        "pin88"
      ],
      "pin87": [
        "LCD_HSYNC_R5",
        "R5",
        "pin87"
      ],
      "pin90": [
        "LCD_PCLK_V5",
        "V5",
        "pin90"
      ],
      "pin89": [
        "LCD_VSYNC_U5",
        "U5",
        "pin89"
      ]
    },
    "schPinArrangement": {
      "leftSide": {
        "pins": [
          231,
          105,
          15,
          33,
          51,
          69,
          16,
          34,
          52,
          70,
          17
        ],
        "direction": "top-to-bottom"
      },
      "rightSide": {
        "pins": [
          35,
          53,
          71,
          36,
          54,
          72,
          88,
          87,
          90,
          89
        ],
        "direction": "top-to-bottom"
      }
    },
    "schPinStyle": {
      "pin231": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin105": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin15": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin33": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin51": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin69": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin16": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin34": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin52": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin70": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin17": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin35": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin53": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin71": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin36": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin54": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin72": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin88": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin87": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin90": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin89": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  {
    "name": "U1 · storage / console / debug",
    "chipRef": "chip.U1",
    "schSheetName": "sheet_io",
    "schX": -30,
    "schY": 18,
    "width": 12,
    "height": 6.15,
    "pinLabels": {
      "pin237": [
        "EMU0_C14",
        "C14",
        "pin237"
      ],
      "pin236": [
        "EMU1_B14",
        "B14",
        "pin236"
      ],
      "pin295": [
        "MMC0_CLK_G17",
        "G17",
        "pin295"
      ],
      "pin313": [
        "MMC0_CMD_G18",
        "G18",
        "pin313"
      ],
      "pin277": [
        "MMC0_DAT0_G16",
        "G16",
        "pin277"
      ],
      "pin259": [
        "MMC0_DAT1_G15",
        "G15",
        "pin259"
      ],
      "pin312": [
        "MMC0_DAT2_F18",
        "F18",
        "pin312"
      ],
      "pin294": [
        "MMC0_DAT3_F17",
        "F17",
        "pin294"
      ],
      "pin199": [
        "TCK_A12",
        "A12",
        "pin199"
      ],
      "pin182": [
        "TDI_B11",
        "B11",
        "pin182"
      ],
      "pin181": [
        "TDO_A11",
        "A11",
        "pin181"
      ],
      "pin183": [
        "TMS_C11",
        "C11",
        "pin183"
      ],
      "pin164": [
        "TRSTn_B10",
        "B10",
        "pin164"
      ],
      "pin257": [
        "UART0_RXD_E15",
        "E15",
        "pin257"
      ],
      "pin275": [
        "UART0_TXD_E16",
        "E16",
        "pin275"
      ]
    },
    "schPinArrangement": {
      "leftSide": {
        "pins": [
          237,
          236,
          295,
          313,
          277,
          259,
          312,
          294
        ],
        "direction": "top-to-bottom"
      },
      "rightSide": {
        "pins": [
          199,
          182,
          181,
          183,
          164,
          257,
          275
        ],
        "direction": "top-to-bottom"
      }
    },
    "schPinStyle": {
      "pin237": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin236": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin295": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin313": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin277": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin259": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin312": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin294": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin199": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin182": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin181": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin183": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin164": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin257": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin275": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  {
    "name": "U1 · indicator controls",
    "chipRef": "chip.U1",
    "schSheetName": "sheet_indicators",
    "schX": -23,
    "schY": 9,
    "width": 9,
    "height": 2.5,
    "pinLabels": {
      "pin309": [
        "ECAP0_IN_PWM0_OUT_C18",
        "C18",
        "pin309"
      ],
      "pin290": [
        "SPI0_D0_B17",
        "B17",
        "pin290"
      ]
    },
    "schPinArrangement": {
      "leftSide": {
        "pins": [
          309
        ],
        "direction": "top-to-bottom"
      },
      "rightSide": {
        "pins": [
          290
        ],
        "direction": "top-to-bottom"
      }
    },
    "schPinStyle": {
      "pin309": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin290": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  {
    "name": "U1 · unused balls 1",
    "chipRef": "chip.U1",
    "schSheetName": "sheet_unused",
    "schX": -24,
    "schY": 0,
    "width": 12,
    "height": 11.35,
    "pinLabels": {
      "pin92": [
        "AIN0_B6",
        "B6",
        "pin92"
      ],
      "pin111": [
        "AIN1_C7",
        "C7",
        "pin111"
      ],
      "pin110": [
        "AIN2_B7",
        "B7",
        "pin110"
      ],
      "pin109": [
        "AIN3_A7",
        "A7",
        "pin109"
      ],
      "pin129": [
        "AIN4_C8",
        "C8",
        "pin129"
      ],
      "pin128": [
        "AIN5_B8",
        "B8",
        "pin128"
      ],
      "pin127": [
        "AIN6_A8",
        "A8",
        "pin127"
      ],
      "pin147": [
        "AIN7_C9",
        "C9",
        "pin147"
      ],
      "pin44": [
        "DDR_A13_H3",
        "H3",
        "pin44"
      ],
      "pin62": [
        "DDR_A14_H4",
        "H4",
        "pin62"
      ],
      "pin40": [
        "DDR_A15_D3",
        "D3",
        "pin40"
      ],
      "pin75": [
        "EXT_WAKEUP_C5",
        "C5",
        "pin75"
      ],
      "pin125": [
        "GPMC_AD0_U7",
        "U7",
        "pin125"
      ],
      "pin126": [
        "GPMC_AD1_V7",
        "V7",
        "pin126"
      ],
      "pin141": [
        "GPMC_AD2_R8",
        "R8",
        "pin141"
      ],
      "pin142": [
        "GPMC_AD3_T8",
        "T8",
        "pin142"
      ],
      "pin143": [
        "GPMC_AD4_U8",
        "U8",
        "pin143"
      ],
      "pin144": [
        "GPMC_AD5_V8",
        "V8",
        "pin144"
      ],
      "pin159": [
        "GPMC_AD6_R9",
        "R9",
        "pin159"
      ],
      "pin160": [
        "GPMC_AD7_T9",
        "T9",
        "pin160"
      ],
      "pin179": [
        "GPMC_AD8_U10",
        "U10",
        "pin179"
      ],
      "pin178": [
        "GPMC_AD9_T10",
        "T10",
        "pin178"
      ],
      "pin196": [
        "GPMC_AD10_T11",
        "T11",
        "pin196"
      ],
      "pin123": [
        "GPMC_ADVn_ALE_R7",
        "R7",
        "pin123"
      ],
      "pin106": [
        "GPMC_BEn0_CLE_T6",
        "T6",
        "pin106"
      ],
      "pin108": [
        "GPMC_CSn0_V6",
        "V6",
        "pin108"
      ],
      "pin161": [
        "GPMC_CSn1_U9",
        "U9",
        "pin161"
      ],
      "pin162": [
        "GPMC_CSn2_V9",
        "V9",
        "pin162"
      ],
      "pin124": [
        "GPMC_OEn_REn_T7",
        "T7",
        "pin124"
      ],
      "pin107": [
        "GPMC_WEn_U6",
        "U6",
        "pin107"
      ],
      "pin37": [
        "RESERVED_A3",
        "A3",
        "pin37"
      ]
    },
    "schPinArrangement": {
      "leftSide": {
        "pins": [
          92,
          111,
          110,
          109,
          129,
          128,
          127,
          147,
          44,
          62,
          40,
          75,
          125,
          126,
          141,
          142
        ],
        "direction": "top-to-bottom"
      },
      "rightSide": {
        "pins": [
          143,
          144,
          159,
          160,
          179,
          178,
          196,
          123,
          106,
          108,
          161,
          162,
          124,
          107,
          37
        ],
        "direction": "top-to-bottom"
      }
    },
    "schPinStyle": {
      "pin92": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin111": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin110": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin109": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin129": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin128": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin127": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin147": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin44": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin62": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin40": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin75": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin125": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin126": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin141": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin142": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin143": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin144": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin159": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin160": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin179": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin178": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin196": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin123": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin106": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin108": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin161": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin162": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin124": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin107": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin37": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  {
    "name": "U1 · unused balls 2",
    "chipRef": "chip.U1",
    "schSheetName": "sheet_unused",
    "schX": 0,
    "schY": 0,
    "width": 12,
    "height": 11.35,
    "pinLabels": {
      "pin252": [
        "GPMC_A1_V14",
        "V14",
        "pin252"
      ],
      "pin251": [
        "GPMC_A2_U14",
        "U14",
        "pin251"
      ],
      "pin249": [
        "GPMC_A4_R14",
        "R14",
        "pin249"
      ],
      "pin270": [
        "GPMC_A5_V15",
        "V15",
        "pin270"
      ],
      "pin269": [
        "GPMC_A6_U15",
        "U15",
        "pin269"
      ],
      "pin268": [
        "GPMC_A7_T15",
        "T15",
        "pin268"
      ],
      "pin215": [
        "GPMC_AD11_U12",
        "U12",
        "pin215"
      ],
      "pin214": [
        "GPMC_AD12_T12",
        "T12",
        "pin214"
      ],
      "pin213": [
        "GPMC_AD13_R12",
        "R12",
        "pin213"
      ],
      "pin234": [
        "GPMC_AD14_V13",
        "V13",
        "pin234"
      ],
      "pin233": [
        "GPMC_AD15_U13",
        "U13",
        "pin233"
      ],
      "pin216": [
        "GPMC_CLK_V12",
        "V12",
        "pin216"
      ],
      "pin232": [
        "GPMC_CSn3_T13",
        "T13",
        "pin232"
      ],
      "pin200": [
        "MCASP0_ACLKR_B12",
        "B12",
        "pin200"
      ],
      "pin217": [
        "MCASP0_ACLKX_A13",
        "A13",
        "pin217"
      ],
      "pin201": [
        "MCASP0_AHCLKR_C12",
        "C12",
        "pin201"
      ],
      "pin235": [
        "MCASP0_AHCLKX_A14",
        "A14",
        "pin235"
      ],
      "pin202": [
        "MCASP0_AXR0_D12",
        "D12",
        "pin202"
      ],
      "pin220": [
        "MCASP0_AXR1_D13",
        "D13",
        "pin220"
      ],
      "pin219": [
        "MCASP0_FSR_C13",
        "C13",
        "pin219"
      ],
      "pin218": [
        "MCASP0_FSX_B13",
        "B13",
        "pin218"
      ],
      "pin261": [
        "MII1_RX_ER_J15",
        "J15",
        "pin261"
      ],
      "pin263": [
        "MII1_RXD1_L15",
        "L15",
        "pin263"
      ],
      "pin262": [
        "MII1_TXD2_K15",
        "K15",
        "pin262"
      ],
      "pin271": [
        "SPI0_CS0_A16",
        "A16",
        "pin271"
      ],
      "pin255": [
        "SPI0_CS1_C15",
        "C15",
        "pin255"
      ],
      "pin272": [
        "SPI0_D1_B16",
        "B16",
        "pin272"
      ],
      "pin256": [
        "UART1_TXD_D15",
        "D15",
        "pin256"
      ],
      "pin264": [
        "USB0_CE_M15",
        "M15",
        "pin264"
      ],
      "pin253": [
        "XDMA_EVENT_INTR0_A15",
        "A15",
        "pin253"
      ],
      "pin238": [
        "XDMA_EVENT_INTR1_D14",
        "D14",
        "pin238"
      ]
    },
    "schPinArrangement": {
      "leftSide": {
        "pins": [
          252,
          251,
          249,
          270,
          269,
          268,
          215,
          214,
          213,
          234,
          233,
          216,
          232,
          200,
          217,
          201
        ],
        "direction": "top-to-bottom"
      },
      "rightSide": {
        "pins": [
          235,
          202,
          220,
          219,
          218,
          261,
          263,
          262,
          271,
          255,
          272,
          256,
          264,
          253,
          238
        ],
        "direction": "top-to-bottom"
      }
    },
    "schPinStyle": {
      "pin252": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin251": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin249": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin270": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin269": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin268": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin215": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin214": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin213": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin234": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin233": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin216": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin232": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin200": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin217": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin201": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin235": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin202": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin220": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin219": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin218": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin261": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin263": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin262": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin271": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin255": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin272": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin256": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin264": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin253": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin238": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  {
    "name": "U1 · unused balls 3",
    "chipRef": "chip.U1",
    "schSheetName": "sheet_unused",
    "schX": 24,
    "schY": 0,
    "width": 12,
    "height": 10.7,
    "pinLabels": {
      "pin308": [
        "EXTINTn_B18",
        "B18",
        "pin308"
      ],
      "pin288": [
        "GPMC_A8_V16",
        "V16",
        "pin288"
      ],
      "pin287": [
        "GPMC_A9_U16",
        "U16",
        "pin287"
      ],
      "pin286": [
        "GPMC_A10_T16",
        "T16",
        "pin286"
      ],
      "pin323": [
        "GPMC_BEn1_U18",
        "U18",
        "pin323"
      ],
      "pin304": [
        "GPMC_WAIT0_T17",
        "T17",
        "pin304"
      ],
      "pin305": [
        "GPMC_WPn_U17",
        "U17",
        "pin305"
      ],
      "pin318": [
        "MDC_M18",
        "M18",
        "pin318"
      ],
      "pin300": [
        "MDIO_M17",
        "M17",
        "pin300"
      ],
      "pin278": [
        "MII1_COL_H16",
        "H16",
        "pin278"
      ],
      "pin296": [
        "MII1_CRS_H17",
        "H17",
        "pin296"
      ],
      "pin317": [
        "MII1_RX_CLK_L18",
        "L18",
        "pin317"
      ],
      "pin297": [
        "MII1_RX_DV_J17",
        "J17",
        "pin297"
      ],
      "pin282": [
        "MII1_RXD0_M16",
        "M16",
        "pin282"
      ],
      "pin281": [
        "MII1_RXD2_L16",
        "L16",
        "pin281"
      ],
      "pin299": [
        "MII1_RXD3_L17",
        "L17",
        "pin299"
      ],
      "pin316": [
        "MII1_TX_CLK_K18",
        "K18",
        "pin316"
      ],
      "pin279": [
        "MII1_TX_EN_J16",
        "J16",
        "pin279"
      ],
      "pin298": [
        "MII1_TXD0_K17",
        "K17",
        "pin298"
      ],
      "pin280": [
        "MII1_TXD1_K16",
        "K16",
        "pin280"
      ],
      "pin315": [
        "MII1_TXD3_J18",
        "J18",
        "pin315"
      ],
      "pin314": [
        "RMII1_REF_CLK_H18",
        "H18",
        "pin314"
      ],
      "pin289": [
        "SPI0_SCLK_A17",
        "A17",
        "pin289"
      ],
      "pin311": [
        "UART0_CTSn_E18",
        "E18",
        "pin311"
      ],
      "pin293": [
        "UART0_RTSn_E17",
        "E17",
        "pin293"
      ],
      "pin310": [
        "UART1_CTSn_D18",
        "D18",
        "pin310"
      ],
      "pin292": [
        "UART1_RTSn_D17",
        "D17",
        "pin292"
      ],
      "pin274": [
        "UART1_RXD_D16",
        "D16",
        "pin274"
      ],
      "pin320": [
        "USB1_CE_P18",
        "P18",
        "pin320"
      ]
    },
    "schPinArrangement": {
      "leftSide": {
        "pins": [
          308,
          288,
          287,
          286,
          323,
          304,
          305,
          318,
          300,
          278,
          296,
          317,
          297,
          282,
          281
        ],
        "direction": "top-to-bottom"
      },
      "rightSide": {
        "pins": [
          299,
          316,
          279,
          298,
          280,
          315,
          314,
          289,
          311,
          293,
          310,
          292,
          274,
          320
        ],
        "direction": "top-to-bottom"
      }
    },
    "schPinStyle": {
      "pin308": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin288": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin287": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin286": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin323": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin304": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin305": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin318": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin300": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin278": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin296": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin317": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin297": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin282": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin281": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin299": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin316": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin279": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin298": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin280": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin315": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin314": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin289": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin311": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin293": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin310": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin292": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin274": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin320": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  {
    "name": "U3 · DDR data",
    "chipRef": "chip.U3",
    "schSheetName": "sheet_ddr",
    "schX": 20,
    "schY": 12,
    "width": 8,
    "height": 15.25,
    "pinLabels": {
      "pin37": [
        "DQL0_E3",
        "E3",
        "pin37"
      ],
      "pin54": [
        "DQL1_F7",
        "F7",
        "pin54"
      ],
      "pin22": [
        "DQL2_F2",
        "F2",
        "pin22"
      ],
      "pin70": [
        "DQL3_F8",
        "F8",
        "pin70"
      ],
      "pin40": [
        "DQL4_H3",
        "H3",
        "pin40"
      ],
      "pin72": [
        "DQL5_H8",
        "H8",
        "pin72"
      ],
      "pin23": [
        "DQL6_G2",
        "G2",
        "pin23"
      ],
      "pin56": [
        "DQL7_H7",
        "H7",
        "pin56"
      ],
      "pin52": [
        "DQU0_D7",
        "D7",
        "pin52"
      ],
      "pin35": [
        "DQU1_C3",
        "C3",
        "pin35"
      ],
      "pin67": [
        "DQU2_C8",
        "C8",
        "pin67"
      ],
      "pin19": [
        "DQU3_C2",
        "C2",
        "pin19"
      ],
      "pin49": [
        "DQU4_A7",
        "A7",
        "pin49"
      ],
      "pin17": [
        "DQU5_A2",
        "A2",
        "pin17"
      ],
      "pin66": [
        "DQU6_B8",
        "B8",
        "pin66"
      ],
      "pin33": [
        "DQU7_A3",
        "A3",
        "pin33"
      ],
      "pin53": [
        "DML_E7",
        "E7",
        "pin53"
      ],
      "pin36": [
        "DMU_D3",
        "D3",
        "pin36"
      ],
      "pin38": [
        "DQSL_F3",
        "F3",
        "pin38"
      ],
      "pin51": [
        "DQSU_C7",
        "C7",
        "pin51"
      ],
      "pin39": [
        "N_DQSl_G3",
        "G3",
        "pin39"
      ],
      "pin50": [
        "N_DQSU_B7",
        "B7",
        "pin50"
      ]
    },
    "schPinArrangement": {
      "leftSide": {
        "pins": [
          37,
          54,
          22,
          70,
          40,
          72,
          23,
          56,
          52,
          35,
          67,
          19,
          49,
          17,
          66,
          33,
          53,
          36,
          38,
          51,
          39,
          50
        ],
        "direction": "top-to-bottom"
      }
    },
    "schPinStyle": {
      "pin37": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin54": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin22": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin70": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin40": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin72": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin23": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin56": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin52": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin35": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin67": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin19": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin49": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin17": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin66": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin33": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin53": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin36": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin38": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin51": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin39": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin50": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  {
    "name": "U3 · DDR address / control",
    "chipRef": "chip.U3",
    "schSheetName": "sheet_ddr",
    "schX": 20,
    "schY": -9,
    "width": 8,
    "height": 18.500000000000004,
    "pinLabels": {
      "pin45": [
        "A0_N3",
        "N3",
        "pin45"
      ],
      "pin62": [
        "A1_P7",
        "P7",
        "pin62"
      ],
      "pin46": [
        "A2_P3",
        "P3",
        "pin46"
      ],
      "pin29": [
        "A3_N2",
        "N2",
        "pin29"
      ],
      "pin78": [
        "A4_P8",
        "P8",
        "pin78"
      ],
      "pin30": [
        "A5_P2",
        "P2",
        "pin30"
      ],
      "pin79": [
        "A6_R8",
        "R8",
        "pin79"
      ],
      "pin31": [
        "A7_R2",
        "R2",
        "pin31"
      ],
      "pin80": [
        "A8_T8",
        "T8",
        "pin80"
      ],
      "pin47": [
        "A9_R3",
        "R3",
        "pin47"
      ],
      "pin59": [
        "A10_L7",
        "L7",
        "pin59"
      ],
      "pin63": [
        "A11_R7",
        "R7",
        "pin63"
      ],
      "pin61": [
        "A12_N7",
        "N7",
        "pin61"
      ],
      "pin28": [
        "BA0_M2",
        "M2",
        "pin28"
      ],
      "pin77": [
        "BA1_N8",
        "N8",
        "pin77"
      ],
      "pin44": [
        "BA2_M3",
        "M3",
        "pin44"
      ],
      "pin42": [
        "N_CAS_K3",
        "K3",
        "pin42"
      ],
      "pin57": [
        "CK_J7",
        "J7",
        "pin57"
      ],
      "pin90": [
        "CKE_K9",
        "K9",
        "pin90"
      ],
      "pin58": [
        "N_CK_K7",
        "K7",
        "pin58"
      ],
      "pin27": [
        "N_CS_L2",
        "L2",
        "pin27"
      ],
      "pin10": [
        "ODT_K1",
        "K1",
        "pin10"
      ],
      "pin41": [
        "N_RAS_J3",
        "J3",
        "pin41"
      ],
      "pin32": [
        "N_RESET_T2",
        "T2",
        "pin32"
      ],
      "pin43": [
        "N_WE_L3",
        "L3",
        "pin43"
      ]
    },
    "schPinArrangement": {
      "leftSide": {
        "pins": [
          45,
          62,
          46,
          29,
          78,
          30,
          79,
          31,
          80,
          47,
          59,
          63,
          61,
          28,
          77,
          44,
          42,
          57,
          90,
          58,
          27,
          10,
          41,
          32,
          43
        ],
        "direction": "top-to-bottom"
      }
    },
    "schPinStyle": {
      "pin45": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin62": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin46": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin29": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin78": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin30": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin79": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin31": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin80": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin47": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin59": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin63": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin61": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin28": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin77": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin44": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin42": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin57": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin90": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin58": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin27": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin10": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin41": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin32": {
        "marginTop": 0.225,
        "marginBottom": 0.875
      },
      "pin43": {
        "marginTop": 0.875,
        "marginBottom": 0.225
      }
    }
  },
  {
    "name": "U3 · supplies / ground",
    "chipRef": "chip.U3",
    "schSheetName": "sheet_ddr_power",
    "schX": -20,
    "schY": 11,
    "width": 11,
    "height": 14.6,
    "pinLabels": {
      "pin1": [
        "VDDQ1_A1",
        "A1",
        "pin1"
      ],
      "pin3": [
        "VDDQ2_C1",
        "C1",
        "pin3"
      ],
      "pin6": [
        "VDDQ3_F1",
        "F1",
        "pin6"
      ],
      "pin13": [
        "VDD1_N1",
        "N1",
        "pin13"
      ],
      "pin15": [
        "VDD2_R1",
        "R1",
        "pin15"
      ],
      "pin18": [
        "VDD3_B2",
        "B2",
        "pin18"
      ],
      "pin20": [
        "VDDQ4_D2",
        "D2",
        "pin20"
      ],
      "pin24": [
        "VDDQ5_H2",
        "H2",
        "pin24"
      ],
      "pin26": [
        "VDD4_K2",
        "K2",
        "pin26"
      ],
      "pin55": [
        "VDD5_G7",
        "G7",
        "pin55"
      ],
      "pin65": [
        "VDDQ6_A8",
        "A8",
        "pin65"
      ],
      "pin74": [
        "VDD6_K8",
        "K8",
        "pin74"
      ],
      "pin83": [
        "VDDQ7_C9",
        "C9",
        "pin83"
      ],
      "pin84": [
        "VDD7_D9",
        "D9",
        "pin84"
      ],
      "pin85": [
        "VDDQ8_E9",
        "E9",
        "pin85"
      ],
      "pin88": [
        "VDDQ9_H9",
        "H9",
        "pin88"
      ],
      "pin93": [
        "VDD8_N9",
        "N9",
        "pin93"
      ],
      "pin95": [
        "VDD9_R9",
        "R9",
        "pin95"
      ],
      "pin8": [
        "VREFDQ_H1",
        "H1",
        "pin8"
      ],
      "pin76": [
        "VREFCA_M8",
        "M8",
        "pin76"
      ],
      "pin75": [
        "ZQ_L8",
        "L8",
        "pin75"
      ],
      "pin2": [
        "VSSQ1_B1",
        "B1",
        "pin2"
      ],
      "pin4": [
        "VSSQ2_D1",
        "D1",
        "pin4"
      ],
      "pin5": [
        "VSS1_E1",
        "E1",
        "pin5"
      ],
      "pin7": [
        "VSSQ3_G1",
        "G1",
        "pin7"
      ],
      "pin12": [
        "VSS2_M1",
        "M1",
        "pin12"
      ],
      "pin14": [
        "VSS3_P1",
        "P1",
        "pin14"
      ],
      "pin16": [
        "VSS4_T1",
        "T1",
        "pin16"
      ],
      "pin21": [
        "VSSQ4_E2",
        "E2",
        "pin21"
      ],
      "pin25": [
        "VSS5_J2",
        "J2",
        "pin25"
      ],
      "pin34": [
        "VSS6_B3",
        "B3",
        "pin34"
      ],
      "pin68": [
        "VSSQ5_D8",
        "D8",
        "pin68"
      ],
      "pin69": [
        "VSSQ6_E8",
        "E8",
        "pin69"
      ],
      "pin71": [
        "VSS7_G8",
        "G8",
        "pin71"
      ],
      "pin73": [
        "VSS8_J8",
        "J8",
        "pin73"
      ],
      "pin81": [
        "VSS9_A9",
        "A9",
        "pin81"
      ],
      "pin82": [
        "VSSQ7_B9",
        "B9",
        "pin82"
      ],
      "pin86": [
        "VSSQ8_F9",
        "F9",
        "pin86"
      ],
      "pin87": [
        "VSSQ9_G9",
        "G9",
        "pin87"
      ],
      "pin92": [
        "VSS10_M9",
        "M9",
        "pin92"
      ],
      "pin94": [
        "VSS11_P9",
        "P9",
        "pin94"
      ],
      "pin96": [
        "VSS12_T9",
        "T9",
        "pin96"
      ]
    },
    "schPinArrangement": {
      "leftSide": {
        "pins": [
          1,
          3,
          6,
          13,
          15,
          18,
          20,
          24,
          26,
          55,
          65,
          74,
          83,
          84,
          85,
          88,
          93,
          95,
          8,
          76,
          75
        ],
        "direction": "top-to-bottom"
      },
      "rightSide": {
        "pins": [
          2,
          4,
          5,
          7,
          12,
          14,
          16,
          21,
          25,
          34,
          68,
          69,
          71,
          73,
          81,
          82,
          86,
          87,
          92,
          94,
          96
        ],
        "direction": "top-to-bottom"
      }
    },
    "schPinStyle": {
      "pin1": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin3": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin6": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin13": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin15": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin18": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin20": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin24": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin26": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin55": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin65": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin74": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin83": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin84": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin85": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin88": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin93": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin95": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin8": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin76": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin75": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin2": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin4": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin5": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin7": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin12": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin14": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin16": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin21": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin25": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin34": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin68": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin69": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin71": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin73": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin81": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin82": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin86": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin87": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin92": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin94": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin96": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  {
    "name": "U3 · reserved balls",
    "chipRef": "chip.U3",
    "schSheetName": "sheet_ddr_power",
    "schX": 20,
    "schY": 13,
    "width": 8,
    "height": 3.5500000000000003,
    "pinLabels": {
      "pin9": [
        "NC1_J1",
        "J1",
        "pin9"
      ],
      "pin11": [
        "NC2_L1",
        "L1",
        "pin11"
      ],
      "pin48": [
        "NC3_T3",
        "T3",
        "pin48"
      ],
      "pin60": [
        "NC4_M7",
        "M7",
        "pin60"
      ],
      "pin64": [
        "NC5_T7",
        "T7",
        "pin64"
      ],
      "pin89": [
        "NC6_J9",
        "J9",
        "pin89"
      ],
      "pin91": [
        "NC7_L9",
        "L9",
        "pin91"
      ]
    },
    "schPinArrangement": {
      "leftSide": {
        "pins": [
          9,
          11,
          48,
          60
        ],
        "direction": "top-to-bottom"
      },
      "rightSide": {
        "pins": [
          64,
          89,
          91
        ],
        "direction": "top-to-bottom"
      }
    },
    "schPinStyle": {
      "pin9": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin11": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin48": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin60": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin64": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin89": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin91": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  {
    "name": "U_HDMI · parallel video input",
    "chipRef": "chip.U_HDMI",
    "schSheetName": "sheet_video",
    "schX": 2,
    "schY": 14,
    "width": 12,
    "height": 10.7,
    "pinLabels": {
      "pin41": [
        "DATA18",
        "pin41"
      ],
      "pin42": [
        "DATA17",
        "pin42"
      ],
      "pin43": [
        "DATA16",
        "pin43"
      ],
      "pin52": [
        "DATA9",
        "pin52"
      ],
      "pin53": [
        "DATA8",
        "pin53"
      ],
      "pin56": [
        "IDCK_N",
        "pin56"
      ],
      "pin61": [
        "DATA2",
        "pin61"
      ],
      "pin62": [
        "DATA1",
        "pin62"
      ],
      "pin63": [
        "DATA0",
        "pin63"
      ],
      "pin2": [
        "DE",
        "pin2"
      ],
      "pin60": [
        "DATA3",
        "pin60"
      ],
      "pin59": [
        "DATA4",
        "pin59"
      ],
      "pin58": [
        "DATA5",
        "pin58"
      ],
      "pin55": [
        "DATA6",
        "pin55"
      ],
      "pin54": [
        "DATA7",
        "pin54"
      ],
      "pin51": [
        "DATA10",
        "pin51"
      ],
      "pin50": [
        "DATA11",
        "pin50"
      ],
      "pin47": [
        "DATA12",
        "pin47"
      ],
      "pin46": [
        "DATA13",
        "pin46"
      ],
      "pin45": [
        "DATA14",
        "pin45"
      ],
      "pin44": [
        "DATA15",
        "pin44"
      ],
      "pin40": [
        "DATA19",
        "pin40"
      ],
      "pin39": [
        "DATA20",
        "pin39"
      ],
      "pin38": [
        "DATA21",
        "pin38"
      ],
      "pin37": [
        "DATA22",
        "pin37"
      ],
      "pin36": [
        "DATA23",
        "pin36"
      ],
      "pin4": [
        "HSYNC",
        "pin4"
      ],
      "pin57": [
        "IDCK_P",
        "pin57"
      ],
      "pin5": [
        "VSYNC",
        "pin5"
      ]
    },
    "schPinArrangement": {
      "leftSide": {
        "pins": [
          41,
          42,
          43,
          52,
          53,
          56,
          61,
          62,
          63,
          2,
          60,
          59,
          58,
          55,
          54
        ],
        "direction": "top-to-bottom"
      },
      "rightSide": {
        "pins": [
          51,
          50,
          47,
          46,
          45,
          44,
          40,
          39,
          38,
          37,
          36,
          4,
          57,
          5
        ],
        "direction": "top-to-bottom"
      }
    },
    "schPinStyle": {
      "pin41": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin42": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin43": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin52": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin53": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin56": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin61": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin62": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin63": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin2": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin60": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin59": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin58": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin55": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin54": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin51": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin50": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin47": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin46": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin45": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin44": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin40": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin39": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin38": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin37": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin36": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin4": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin57": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin5": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  {
    "name": "U_HDMI · TMDS output",
    "chipRef": "chip.U_HDMI",
    "schSheetName": "sheet_video",
    "schX": 25,
    "schY": 14,
    "width": 9,
    "height": 3.5500000000000003,
    "pinLabels": {
      "pin21": [
        "TXC_N",
        "pin21"
      ],
      "pin22": [
        "TXC_P",
        "pin22"
      ],
      "pin24": [
        "TX0_N",
        "pin24"
      ],
      "pin25": [
        "TX0_P",
        "pin25"
      ],
      "pin27": [
        "TX1_N",
        "pin27"
      ],
      "pin28": [
        "TX1_P",
        "pin28"
      ],
      "pin30": [
        "TX2_N",
        "pin30"
      ],
      "pin31": [
        "TX2_P",
        "pin31"
      ]
    },
    "schPinArrangement": {
      "leftSide": {
        "pins": [
          21,
          22,
          24,
          25
        ],
        "direction": "top-to-bottom"
      },
      "rightSide": {
        "pins": [
          27,
          28,
          30,
          31
        ],
        "direction": "top-to-bottom"
      }
    },
    "schPinStyle": {
      "pin21": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin22": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin24": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin25": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin27": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin28": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin30": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin31": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  {
    "name": "U_HDMI · supplies / configuration",
    "chipRef": "chip.U_HDMI",
    "schSheetName": "sheet_video",
    "schX": -23,
    "schY": -6,
    "width": 12,
    "height": 10.05,
    "pinLabels": {
      "pin6": [
        "A3_DK3",
        "pin6"
      ],
      "pin7": [
        "CTL2_A2_DK2",
        "pin7"
      ],
      "pin8": [
        "CTL1_A1_DK1",
        "pin8"
      ],
      "pin13": [
        "ISEL_RST",
        "pin13"
      ],
      "pin14": [
        "DSEL_SDA",
        "pin14"
      ],
      "pin16": [
        "DGND_16",
        "pin16"
      ],
      "pin17": [
        "PGND",
        "pin17"
      ],
      "pin20": [
        "TGND_20",
        "pin20"
      ],
      "pin26": [
        "TGND_26",
        "pin26"
      ],
      "pin32": [
        "TGND_32",
        "pin32"
      ],
      "pin34": [
        "RESERVED",
        "pin34"
      ],
      "pin35": [
        "DKEN",
        "pin35"
      ],
      "pin48": [
        "DGND_48",
        "pin48"
      ],
      "pin64": [
        "DGND_64",
        "pin64"
      ],
      "pin65": [
        "THERMAL_PAD",
        "pin65"
      ],
      "pin18": [
        "PVDD",
        "pin18"
      ],
      "pin19": [
        "TFADJ",
        "pin19"
      ],
      "pin23": [
        "TVDD_23",
        "pin23"
      ],
      "pin29": [
        "TVDD_29",
        "pin29"
      ],
      "pin11": [
        "MSEN_PO1",
        "pin11"
      ],
      "pin49": [
        "NC",
        "pin49"
      ],
      "pin10": [
        "PD",
        "pin10"
      ],
      "pin1": [
        "DVDD_1",
        "pin1"
      ],
      "pin3": [
        "VREF",
        "pin3"
      ],
      "pin9": [
        "EDGE_HTPLG",
        "pin9"
      ],
      "pin12": [
        "DVDD_12",
        "pin12"
      ],
      "pin15": [
        "BSEL_SCL",
        "pin15"
      ],
      "pin33": [
        "DVDD_33",
        "pin33"
      ]
    },
    "schPinArrangement": {
      "leftSide": {
        "pins": [
          6,
          7,
          8,
          13,
          14,
          16,
          17,
          20,
          26,
          32,
          34,
          35,
          48,
          64
        ],
        "direction": "top-to-bottom"
      },
      "rightSide": {
        "pins": [
          65,
          18,
          19,
          23,
          29,
          11,
          49,
          10,
          1,
          3,
          9,
          12,
          15,
          33
        ],
        "direction": "top-to-bottom"
      }
    },
    "schPinStyle": {
      "pin6": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin7": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin8": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin13": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin14": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin16": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin17": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin20": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin26": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin32": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin34": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin35": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin48": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin64": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin65": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin18": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin19": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin23": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin29": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin11": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin49": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin10": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin1": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin3": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin9": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin12": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin15": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin33": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  {
    "name": "U_HDMI_ESD · TMDS protection",
    "chipRef": "chip.U_HDMI_ESD",
    "schSheetName": "sheet_hdmi",
    "schX": -25,
    "schY": 10,
    "width": 12,
    "height": 8.75,
    "pinLabels": {
      "pin5": [
        "TMDS_GND1",
        "pin5"
      ],
      "pin8": [
        "TMDS_GND2",
        "pin8"
      ],
      "pin11": [
        "TMDS_GND3",
        "pin11"
      ],
      "pin14": [
        "TMDS_GND4",
        "pin14"
      ],
      "pin25": [
        "TMDS_GND5",
        "pin25"
      ],
      "pin28": [
        "TMDS_GND6",
        "pin28"
      ],
      "pin31": [
        "TMDS_GND7",
        "pin31"
      ],
      "pin34": [
        "TMDS_GND8",
        "pin34"
      ],
      "pin15": [
        "TMDS_CK_NEG1",
        "pin15"
      ],
      "pin24": [
        "TMDS_CK_NEG2",
        "pin24"
      ],
      "pin13": [
        "TMDS_CK_POS1",
        "pin13"
      ],
      "pin26": [
        "TMDS_CK_POS2",
        "pin26"
      ],
      "pin12": [
        "TMDS_D0_NEG1",
        "pin12"
      ],
      "pin27": [
        "TMDS_D0_NEG2",
        "pin27"
      ],
      "pin10": [
        "TMDS_D0_POS1",
        "pin10"
      ],
      "pin29": [
        "TMDS_D0_POS2",
        "pin29"
      ],
      "pin9": [
        "TMDS_D1_NEG1",
        "pin9"
      ],
      "pin30": [
        "TMDS_D1_NEG2",
        "pin30"
      ],
      "pin7": [
        "TMDS_D1_POS1",
        "pin7"
      ],
      "pin32": [
        "TMDS_D1_POS2",
        "pin32"
      ],
      "pin6": [
        "TMDS_D2_NEG1",
        "pin6"
      ],
      "pin33": [
        "TMDS_D2_NEG2",
        "pin33"
      ],
      "pin4": [
        "TMDS_D2_POS1",
        "pin4"
      ],
      "pin35": [
        "TMDS_D2_POS2",
        "pin35"
      ]
    },
    "schPinArrangement": {
      "leftSide": {
        "pins": [
          5,
          8,
          11,
          14,
          25,
          28,
          31,
          34,
          15,
          24,
          13,
          26
        ],
        "direction": "top-to-bottom"
      },
      "rightSide": {
        "pins": [
          12,
          27,
          10,
          29,
          9,
          30,
          7,
          32,
          6,
          33,
          4,
          35
        ],
        "direction": "top-to-bottom"
      }
    },
    "schPinStyle": {
      "pin5": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin8": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin11": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin14": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin25": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin28": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin31": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin34": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin15": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin24": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin13": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin26": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin12": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin27": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin10": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin29": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin9": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin30": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin7": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin32": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin6": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin33": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin4": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin35": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  {
    "name": "U_HDMI_ESD · DDC / HPD / supply",
    "chipRef": "chip.U_HDMI_ESD",
    "schSheetName": "sheet_hdmi",
    "schX": 0,
    "schY": 10,
    "width": 12,
    "height": 5.5,
    "pinLabels": {
      "pin16": [
        "CE_REMOTE_IN",
        "pin16"
      ],
      "pin23": [
        "CE_REMOTE_OUT",
        "pin23"
      ],
      "pin3": [
        "GND1",
        "pin3"
      ],
      "pin36": [
        "GND2",
        "pin36"
      ],
      "pin38": [
        "5V_OUT",
        "pin38"
      ],
      "pin37": [
        "ESD_BYP",
        "pin37"
      ],
      "pin19": [
        "HOTPLUG_DET_IN",
        "pin19"
      ],
      "pin20": [
        "HOTPLUG_DET_OUT",
        "pin20"
      ],
      "pin22": [
        "DDC_CLK_OUT",
        "pin22"
      ],
      "pin21": [
        "DDC_DAT_OUT",
        "pin21"
      ],
      "pin17": [
        "DDC_CLK_IN",
        "pin17"
      ],
      "pin18": [
        "DDC_DAT_IN",
        "pin18"
      ],
      "pin2": [
        "LV_SUPPLY",
        "pin2"
      ],
      "pin1": [
        "5V_SUPPLY",
        "pin1"
      ]
    },
    "schPinArrangement": {
      "leftSide": {
        "pins": [
          16,
          23,
          3,
          36,
          38,
          37,
          19
        ],
        "direction": "top-to-bottom"
      },
      "rightSide": {
        "pins": [
          20,
          22,
          21,
          17,
          18,
          2,
          1
        ],
        "direction": "top-to-bottom"
      }
    },
    "schPinStyle": {
      "pin16": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin23": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin3": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin36": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin38": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin37": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin19": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin20": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin22": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin21": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin17": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin18": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin2": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin1": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  }
]

export const notes = [
  {
    "text": "Power input / USB-C PD and auxiliary JST",
    "schX": -36.8,
    "schY": 28.8,
    "fontSize": 0.6,
    "color": "#30404b",
    "anchor": "left",
    "sheetName": "sheet_pd"
  },
  {
    "text": "Regulated 5 V inputs. USB-C data and SBU pins are intentionally unused.",
    "schX": -36.8,
    "schY": 27.6,
    "fontSize": 0.3,
    "color": "#677b89",
    "anchor": "left",
    "sheetName": "sheet_pd"
  },
  {
    "text": "USB-C / negotiated 5 V",
    "schX": -32,
    "schY": 22,
    "fontSize": 0.42,
    "color": "#006b3c",
    "anchor": "left",
    "sheetName": "sheet_pd"
  },
  {
    "text": "Auxiliary JST / fuse / reverse polarity / source selection",
    "schX": -32,
    "schY": 7.5,
    "fontSize": 0.42,
    "color": "#006b3c",
    "anchor": "left",
    "sheetName": "sheet_pd"
  },
  {
    "text": "JP_PWR: 1 USB / 2 VIN_5V / 3 AUX. One shunt: USB 1–2 default; AUX 2–3.",
    "schX": -32,
    "schY": -4.5,
    "fontSize": 0.3,
    "color": "#677b89",
    "anchor": "left",
    "sheetName": "sheet_pd"
  },
  {
    "text": "AUX: 0.75 A continuous at 25 °C; derate when hot. The 1 A fuse is not a current limiter.",
    "schX": -32,
    "schY": -5.8,
    "fontSize": 0.3,
    "color": "#677b89",
    "anchor": "left",
    "sheetName": "sheet_pd"
  },
  {
    "text": "Input filtering / configuration / gate control",
    "schX": -32,
    "schY": -9,
    "fontSize": 0.42,
    "color": "#006b3c",
    "anchor": "left",
    "sheetName": "sheet_pd"
  },
  {
    "text": "PMIC / regulated supplies",
    "schX": -30.8,
    "schY": 26.8,
    "fontSize": 0.6,
    "color": "#30404b",
    "anchor": "left",
    "sheetName": "sheet_pmic"
  },
  {
    "text": "TPS65217CRSLR. Switching outputs, LDOs and reset/I2C controls use the exact board net names.",
    "schX": -30.8,
    "schY": 25.6,
    "fontSize": 0.3,
    "color": "#677b89",
    "anchor": "left",
    "sheetName": "sheet_pmic"
  },
  {
    "text": "Switching inductors / decoupling / PMIC controls",
    "schX": -27,
    "schY": -5,
    "fontSize": 0.42,
    "color": "#006b3c",
    "anchor": "left",
    "sheetName": "sheet_pmic"
  },
  {
    "text": "DDR3 / data and address interface",
    "schX": -30.8,
    "schY": 22.8,
    "fontSize": 0.6,
    "color": "#30404b",
    "anchor": "left",
    "sheetName": "sheet_ddr"
  },
  {
    "text": "U1 and U3 split into functional units. Repeated DDR net names identify the same connection.",
    "schX": -30.8,
    "schY": 21.6,
    "fontSize": 0.3,
    "color": "#677b89",
    "anchor": "left",
    "sheetName": "sheet_ddr"
  },
  {
    "text": "DDR3 / power, reference and termination",
    "schX": -30.8,
    "schY": 27.8,
    "fontSize": 0.6,
    "color": "#30404b",
    "anchor": "left",
    "sheetName": "sheet_ddr_power"
  },
  {
    "text": "All memory power balls are explicit. VREF divider, ZQ calibration and CPU VTP parts are shown below.",
    "schX": -30.8,
    "schY": 26.6,
    "fontSize": 0.3,
    "color": "#677b89",
    "anchor": "left",
    "sheetName": "sheet_ddr_power"
  },
  {
    "text": "DDR_1V5 decoupling / reference / calibration",
    "schX": -27,
    "schY": -6,
    "fontSize": 0.42,
    "color": "#006b3c",
    "anchor": "left",
    "sheetName": "sheet_ddr_power"
  },
  {
    "text": "Processor supplies • core and MPU",
    "schX": -27.8,
    "schY": 19.8,
    "fontSize": 0.6,
    "color": "#30404b",
    "anchor": "left",
    "sheetName": "schematic_sheet_cpu_power_core"
  },
  {
    "text": "VDD_CORE • 20 local capacitors",
    "schX": -8,
    "schY": 15.1,
    "fontSize": 0.4,
    "color": "#30404b",
    "anchor": "left",
    "sheetName": "schematic_sheet_cpu_power_core"
  },
  {
    "text": "VDD_MPU • 7 local capacitors",
    "schX": -8,
    "schY": -6.9,
    "fontSize": 0.4,
    "color": "#30404b",
    "anchor": "left",
    "sheetName": "schematic_sheet_cpu_power_core"
  },
  {
    "text": "Processor supplies • 3.3 V I/O and 1.8 V domains",
    "schX": -27.8,
    "schY": 19.8,
    "fontSize": 0.6,
    "color": "#30404b",
    "anchor": "left",
    "sheetName": "schematic_sheet_cpu_power_io"
  },
  {
    "text": "V3V3 • 19 local capacitors",
    "schX": -8,
    "schY": 15.1,
    "fontSize": 0.4,
    "color": "#30404b",
    "anchor": "left",
    "sheetName": "schematic_sheet_cpu_power_io"
  },
  {
    "text": "V1V8 • 16 local capacitors",
    "schX": -8,
    "schY": -2.9,
    "fontSize": 0.4,
    "color": "#30404b",
    "anchor": "left",
    "sheetName": "schematic_sheet_cpu_power_io"
  },
  {
    "text": "Processor ground • every physical ball",
    "schX": -20.8,
    "schY": 12.8,
    "fontSize": 0.6,
    "color": "#30404b",
    "anchor": "left",
    "sheetName": "schematic_sheet_cpu_power_ground"
  },
  {
    "text": "Grounded control / reference terminals retain their exact signal names.",
    "schX": 0,
    "schY": -7,
    "fontSize": 0.3,
    "color": "#677b89",
    "anchor": "center",
    "sheetName": "schematic_sheet_cpu_power_ground"
  },
  {
    "text": "All displayed terminals connect to the saved GND net.",
    "schX": 0,
    "schY": -8,
    "fontSize": 0.3,
    "color": "#677b89",
    "anchor": "center",
    "sheetName": "schematic_sheet_cpu_power_ground"
  },
  {
    "text": "Processor supplies • DDR, RTC and USB analog",
    "schX": -27.8,
    "schY": 19.8,
    "fontSize": 0.6,
    "color": "#30404b",
    "anchor": "left",
    "sheetName": "schematic_sheet_cpu_power_aux"
  },
  {
    "text": "DDR_1V5 • 7 local capacitors",
    "schX": -8,
    "schY": 13.1,
    "fontSize": 0.4,
    "color": "#30404b",
    "anchor": "left",
    "sheetName": "schematic_sheet_cpu_power_aux"
  },
  {
    "text": "RTC and USB analog decoupling",
    "schX": -8,
    "schY": 3.1,
    "fontSize": 0.4,
    "color": "#30404b",
    "anchor": "left",
    "sheetName": "schematic_sheet_cpu_power_aux"
  },
  {
    "text": "Internal regulator capacitors",
    "schX": -8,
    "schY": -7,
    "fontSize": 0.4,
    "color": "#30404b",
    "anchor": "left",
    "sheetName": "schematic_sheet_cpu_power_aux"
  },
  {
    "text": "Clocks / reset / boot configuration",
    "schX": -30.8,
    "schY": 22.8,
    "fontSize": 0.6,
    "color": "#30404b",
    "anchor": "left",
    "sheetName": "sheet_clock_control"
  },
  {
    "text": "Clock pins, PMIC system controls and the 16 boot straps are retained exactly as wired.",
    "schX": -30.8,
    "schY": 21.6,
    "fontSize": 0.3,
    "color": "#677b89",
    "anchor": "left",
    "sheetName": "sheet_clock_control"
  },
  {
    "text": "24 MHz / 32.768 kHz oscillators",
    "schX": 1,
    "schY": 19,
    "fontSize": 0.42,
    "color": "#006b3c",
    "anchor": "left",
    "sheetName": "sheet_clock_control"
  },
  {
    "text": "Reset / I2C controls",
    "schX": -27,
    "schY": 2,
    "fontSize": 0.42,
    "color": "#006b3c",
    "anchor": "left",
    "sheetName": "sheet_clock_control"
  },
  {
    "text": "Boot strap pull-ups / pull-downs",
    "schX": -27,
    "schY": -9,
    "fontSize": 0.42,
    "color": "#006b3c",
    "anchor": "left",
    "sheetName": "sheet_clock_control"
  },
  {
    "text": "Dual USB host ports",
    "schX": -34.8,
    "schY": 28.8,
    "fontSize": 0.6,
    "color": "#30404b",
    "anchor": "left",
    "sheetName": "sheet_usb"
  },
  {
    "text": "USB0 and USB1. ESD feed-through pins share the same electrical net; power switch controls remain explicit.",
    "schX": -34.8,
    "schY": 27.6,
    "fontSize": 0.3,
    "color": "#677b89",
    "anchor": "left",
    "sheetName": "sheet_usb"
  },
  {
    "text": "VBUS filtering / enables / overcurrent pull-ups",
    "schX": -29,
    "schY": -15,
    "fontSize": 0.42,
    "color": "#006b3c",
    "anchor": "left",
    "sheetName": "sheet_usb"
  },
  {
    "text": "Video / RGB565 to TMDS",
    "schX": -36.8,
    "schY": 24.8,
    "fontSize": 0.6,
    "color": "#30404b",
    "anchor": "left",
    "sheetName": "sheet_video"
  },
  {
    "text": "TFP410 parallel input, hardware configuration and supply generation. Connector protection is on the next sheet.",
    "schX": -36.8,
    "schY": 23.6,
    "fontSize": 0.3,
    "color": "#677b89",
    "anchor": "left",
    "sheetName": "sheet_video"
  },
  {
    "text": "Supply filtering / decoupling / TMDS adjustment",
    "schX": -3,
    "schY": -1,
    "fontSize": 0.42,
    "color": "#006b3c",
    "anchor": "left",
    "sheetName": "sheet_video"
  },
  {
    "text": "HDMI / connector and protection",
    "schX": -34.8,
    "schY": 23.8,
    "fontSize": 0.6,
    "color": "#30404b",
    "anchor": "left",
    "sheetName": "sheet_hdmi"
  },
  {
    "text": "TPD12S521 protection, TMDS pass-through, DDC level conversion, hot-plug detection and connector power.",
    "schX": -34.8,
    "schY": 22.6,
    "fontSize": 0.3,
    "color": "#677b89",
    "anchor": "left",
    "sheetName": "sheet_hdmi"
  },
  {
    "text": "DDC / HPD / output filtering",
    "schX": -29,
    "schY": -7,
    "fontSize": 0.42,
    "color": "#006b3c",
    "anchor": "left",
    "sheetName": "sheet_hdmi"
  },
  {
    "text": "microSD / UART / ARM20 JTAG",
    "schX": -40.8,
    "schY": 31.8,
    "fontSize": 0.6,
    "color": "#30404b",
    "anchor": "left",
    "sheetName": "sheet_io"
  },
  {
    "text": "Boot storage, 3.3 V console UART and optional JTAG. Physical connector numbers and exact board net names are explicit.",
    "schX": -40.8,
    "schY": 30.6,
    "fontSize": 0.3,
    "color": "#677b89",
    "anchor": "left",
    "sheetName": "sheet_io"
  },
  {
    "text": "Console UART / 100 Ω series resistors / target-off isolation",
    "schX": -36,
    "schY": 6.5,
    "fontSize": 0.42,
    "color": "#006b3c",
    "anchor": "left",
    "sheetName": "sheet_io"
  },
  {
    "text": "J_UART: physical 1 RX / 2 GND / 3 TX, 3.3 V signals. The buffer isolates an unpowered target.",
    "schX": -36,
    "schY": -10,
    "fontSize": 0.3,
    "color": "#677b89",
    "anchor": "left",
    "sheetName": "sheet_io"
  },
  {
    "text": "Storage filtering / card detect / debug pulls",
    "schX": -36,
    "schY": -12.5,
    "fontSize": 0.42,
    "color": "#006b3c",
    "anchor": "left",
    "sheetName": "sheet_io"
  },
  {
    "text": "RGB indicators / buzzer",
    "schX": -32.8,
    "schY": 18.8,
    "fontSize": 0.6,
    "color": "#30404b",
    "anchor": "left",
    "sheetName": "sheet_indicators"
  },
  {
    "text": "Level-shifted addressable RGB chain and low-side buzzer driver.",
    "schX": -32.8,
    "schY": 17.6,
    "fontSize": 0.3,
    "color": "#677b89",
    "anchor": "left",
    "sheetName": "sheet_indicators"
  },
  {
    "text": "Data / gate resistors and local decoupling",
    "schX": 2,
    "schY": -0.5,
    "fontSize": 0.42,
    "color": "#006b3c",
    "anchor": "left",
    "sheetName": "sheet_indicators"
  },
  {
    "text": "Processor / unused and reserved balls",
    "schX": -34.8,
    "schY": 16.8,
    "fontSize": 0.6,
    "color": "#30404b",
    "anchor": "left",
    "sheetName": "sheet_unused"
  },
  {
    "text": "Crosses mark genuinely unconnected balls. All package pins are represented; no unused signal is silently hidden.",
    "schX": -34.8,
    "schY": 15.6,
    "fontSize": 0.3,
    "color": "#677b89",
    "anchor": "left",
    "sheetName": "sheet_unused"
  },
  {
    "text": "AM3352 SBC  /  1 of 15  /  Matching net names are connected. Cross = not connected.",
    "schX": -36.8,
    "schY": -28.849999999999998,
    "fontSize": 0.28,
    "color": "#677b89",
    "anchor": "left",
    "sheetName": "sheet_pd"
  },
  {
    "text": "AM3352 SBC  /  2 of 15  /  Matching net names are connected. Cross = not connected.",
    "schX": -30.8,
    "schY": -26.85,
    "fontSize": 0.28,
    "color": "#677b89",
    "anchor": "left",
    "sheetName": "sheet_pmic"
  },
  {
    "text": "AM3352 SBC  /  3 of 15  /  Matching net names are connected. Cross = not connected.",
    "schX": -30.8,
    "schY": -22.85,
    "fontSize": 0.28,
    "color": "#677b89",
    "anchor": "left",
    "sheetName": "sheet_ddr"
  },
  {
    "text": "AM3352 SBC  /  4 of 15  /  Matching net names are connected. Cross = not connected.",
    "schX": -30.8,
    "schY": -27.850000000000005,
    "fontSize": 0.28,
    "color": "#677b89",
    "anchor": "left",
    "sheetName": "sheet_ddr_power"
  },
  {
    "text": "AM3352 SBC  /  5 of 15  /  Matching net names are connected. Cross = not connected.",
    "schX": -27.800000000000004,
    "schY": -19.85,
    "fontSize": 0.28,
    "color": "#677b89",
    "anchor": "left",
    "sheetName": "schematic_sheet_cpu_power_core"
  },
  {
    "text": "AM3352 SBC  /  6 of 15  /  Matching net names are connected. Cross = not connected.",
    "schX": -27.800000000000004,
    "schY": -19.85,
    "fontSize": 0.28,
    "color": "#677b89",
    "anchor": "left",
    "sheetName": "schematic_sheet_cpu_power_io"
  },
  {
    "text": "AM3352 SBC  /  7 of 15  /  Matching net names are connected. Cross = not connected.",
    "schX": -20.8,
    "schY": -12.85,
    "fontSize": 0.28,
    "color": "#677b89",
    "anchor": "left",
    "sheetName": "schematic_sheet_cpu_power_ground"
  },
  {
    "text": "AM3352 SBC  /  8 of 15  /  Matching net names are connected. Cross = not connected.",
    "schX": -27.800000000000004,
    "schY": -19.85,
    "fontSize": 0.28,
    "color": "#677b89",
    "anchor": "left",
    "sheetName": "schematic_sheet_cpu_power_aux"
  },
  {
    "text": "AM3352 SBC  /  9 of 15  /  Matching net names are connected. Cross = not connected.",
    "schX": -30.8,
    "schY": -22.85,
    "fontSize": 0.28,
    "color": "#677b89",
    "anchor": "left",
    "sheetName": "sheet_clock_control"
  },
  {
    "text": "AM3352 SBC  /  10 of 15  /  Matching net names are connected. Cross = not connected.",
    "schX": -34.8,
    "schY": -28.849999999999998,
    "fontSize": 0.28,
    "color": "#677b89",
    "anchor": "left",
    "sheetName": "sheet_usb"
  },
  {
    "text": "AM3352 SBC  /  11 of 15  /  Matching net names are connected. Cross = not connected.",
    "schX": -36.8,
    "schY": -24.85,
    "fontSize": 0.28,
    "color": "#677b89",
    "anchor": "left",
    "sheetName": "sheet_video"
  },
  {
    "text": "AM3352 SBC  /  12 of 15  /  Matching net names are connected. Cross = not connected.",
    "schX": -34.8,
    "schY": -23.85,
    "fontSize": 0.28,
    "color": "#677b89",
    "anchor": "left",
    "sheetName": "sheet_hdmi"
  },
  {
    "text": "AM3352 SBC  /  13 of 15  /  Matching net names are connected. Cross = not connected.",
    "schX": -40.8,
    "schY": -31.85,
    "fontSize": 0.28,
    "color": "#677b89",
    "anchor": "left",
    "sheetName": "sheet_io"
  },
  {
    "text": "AM3352 SBC  /  14 of 15  /  Matching net names are connected. Cross = not connected.",
    "schX": -32.8,
    "schY": -18.85,
    "fontSize": 0.28,
    "color": "#677b89",
    "anchor": "left",
    "sheetName": "sheet_indicators"
  },
  {
    "text": "AM3352 SBC  /  15 of 15  /  Matching net names are connected. Cross = not connected.",
    "schX": -34.8,
    "schY": -16.85,
    "fontSize": 0.28,
    "color": "#677b89",
    "anchor": "left",
    "sheetName": "sheet_unused"
  }
] as const
