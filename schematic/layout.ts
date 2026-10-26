import type { SchematicPinArrangement, SchematicPinStyle } from "@tscircuit/props"

/** Schematic-only placement. PCB coordinates and electrical connections live in design/. */
export interface SchematicPlacement {
  schX: number
  schY: number
  schSheetName: string
  schRotation?: number
  schWidth?: number
  schHeight?: number
  schPinArrangement?: SchematicPinArrangement
  schPinStyle?: SchematicPinStyle
  noSchematicRepresentation?: boolean
}

const placements: Record<string, SchematicPlacement> = {
  "J_PD": {
    "schX": -24,
    "schY": 16,
    "schSheetName": "sheet_pd",
    "schWidth": 9.5,
    "schHeight": 6.15,
    "schPinArrangement": {
      "leftSide": {
        "pins": [
          9,
          7,
          8,
          10,
          1,
          2,
          3,
          4
        ],
        "direction": "top-to-bottom"
      },
      "rightSide": {
        "pins": [
          13,
          14,
          6,
          12,
          15,
          16,
          11,
          5
        ],
        "direction": "top-to-bottom"
      }
    },
    "schPinStyle": {
      "pin9": {
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
      "pin10": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin1": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin2": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin3": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin4": {
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
      "pin6": {
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
      "pin16": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin11": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin5": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  "U_PD": {
    "schX": -2,
    "schY": 16,
    "schSheetName": "sheet_pd",
    "schWidth": 9.5,
    "schHeight": 4.85,
    "schPinArrangement": {
      "leftSide": {
        "pins": [
          5,
          4,
          2,
          3,
          11,
          7
        ],
        "direction": "top-to-bottom"
      },
      "rightSide": {
        "pins": [
          6,
          10,
          8,
          1,
          9
        ],
        "direction": "top-to-bottom"
      }
    },
    "schPinStyle": {
      "pin5": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin4": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin2": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin3": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin11": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin7": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin6": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin10": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin8": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin1": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin9": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  "Q_PD": {
    "schX": 20,
    "schY": 16,
    "schSheetName": "sheet_pd"
  },
  "J_AUX_PWR": {
    "schX": -25,
    "schY": 1,
    "schSheetName": "sheet_pd",
    "schWidth": 11,
    "schHeight": 2.5,
    "schPinArrangement": {
      "leftSide": {
        "pins": [
          1,
          2
        ],
        "direction": "top-to-bottom"
      }
    },
    "schPinStyle": {
      "pin1": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin2": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  "F_AUX": {
    "schX": -9,
    "schY": 1,
    "schSheetName": "sheet_pd",
    "schWidth": 8,
    "schHeight": 2.5,
    "schPinArrangement": {
      "leftSide": {
        "pins": [
          1,
          2
        ],
        "direction": "top-to-bottom"
      }
    },
    "schPinStyle": {
      "pin1": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin2": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  "Q_AUX": {
    "schX": 7,
    "schY": 1,
    "schSheetName": "sheet_pd"
  },
  "JP_PWR": {
    "schX": 25,
    "schY": 1,
    "schSheetName": "sheet_pd",
    "schWidth": 11,
    "schHeight": 2.9000000000000004,
    "schPinArrangement": {
      "leftSide": {
        "pins": [
          1,
          2,
          3
        ],
        "direction": "top-to-bottom"
      }
    },
    "schPinStyle": {
      "pin1": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin2": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin3": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  "C_PD_IN": {
    "schX": -30,
    "schY": -14,
    "schSheetName": "sheet_pd",
    "schRotation": 270
  },
  "C_PD_OUT": {
    "schX": -20.3,
    "schY": -14,
    "schSheetName": "sheet_pd",
    "schRotation": 270
  },
  "C_PD_VDD": {
    "schX": -10.6,
    "schY": -14,
    "schSheetName": "sheet_pd",
    "schRotation": 270
  },
  "R_PD_GATE": {
    "schX": -0.9,
    "schY": -14,
    "schSheetName": "sheet_pd",
    "schRotation": 270
  },
  "R_PD_OFF": {
    "schX": 8.8,
    "schY": -14,
    "schSheetName": "sheet_pd",
    "schRotation": 90
  },
  "R_PD_SENSE": {
    "schX": 18.5,
    "schY": -14,
    "schSheetName": "sheet_pd",
    "schRotation": 270
  },
  "R_PD_VDD": {
    "schX": 28.2,
    "schY": -14,
    "schSheetName": "sheet_pd",
    "schRotation": 270
  },
  "TP_5V": {
    "schX": -30,
    "schY": -20,
    "schSheetName": "sheet_pd"
  },
  "U2": {
    "schX": -19,
    "schY": 8,
    "schSheetName": "sheet_pmic",
    "noSchematicRepresentation": true
  },
  "C_DCDC1": {
    "schX": -27,
    "schY": -9.5,
    "schSheetName": "sheet_pmic",
    "schRotation": 270
  },
  "C_DCDC2": {
    "schX": -18.9,
    "schY": -9.5,
    "schSheetName": "sheet_pmic",
    "schRotation": 270
  },
  "C_DCDC3": {
    "schX": -10.8,
    "schY": -9.5,
    "schSheetName": "sheet_pmic",
    "schRotation": 270
  },
  "C_P0": {
    "schX": -2.7,
    "schY": -9.5,
    "schSheetName": "sheet_pmic",
    "schRotation": 270
  },
  "C_P1": {
    "schX": 5.4,
    "schY": -9.5,
    "schSheetName": "sheet_pmic",
    "schRotation": 270
  },
  "C_P2": {
    "schX": 13.5,
    "schY": -9.5,
    "schSheetName": "sheet_pmic",
    "schRotation": 270
  },
  "C_P3": {
    "schX": 21.6,
    "schY": -9.5,
    "schSheetName": "sheet_pmic",
    "schRotation": 270
  },
  "C_P4": {
    "schX": -27,
    "schY": -15.5,
    "schSheetName": "sheet_pmic",
    "schRotation": 270
  },
  "C_P5": {
    "schX": -18.9,
    "schY": -15.5,
    "schSheetName": "sheet_pmic",
    "schRotation": 270
  },
  "C_P6": {
    "schX": -10.8,
    "schY": -15.5,
    "schSheetName": "sheet_pmic",
    "schRotation": 270
  },
  "C_P7": {
    "schX": -2.7,
    "schY": -15.5,
    "schSheetName": "sheet_pmic",
    "schRotation": 270
  },
  "C_SYS_LOCAL": {
    "schX": 5.4,
    "schY": -15.5,
    "schSheetName": "sheet_pmic",
    "schRotation": 270
  },
  "L1": {
    "schX": 13.5,
    "schY": -15.5,
    "schSheetName": "sheet_pmic",
    "schRotation": 270
  },
  "L2": {
    "schX": 21.6,
    "schY": -15.5,
    "schSheetName": "sheet_pmic",
    "schRotation": 270
  },
  "L3": {
    "schX": -27,
    "schY": -21.5,
    "schSheetName": "sheet_pmic",
    "schRotation": 270
  },
  "R_TS": {
    "schX": -18.9,
    "schY": -21.5,
    "schSheetName": "sheet_pmic",
    "schRotation": 270
  },
  "TP_PB": {
    "schX": -10.8,
    "schY": -21.5,
    "schSheetName": "sheet_pmic"
  },
  "U1": {
    "schX": -20,
    "schY": 12,
    "schSheetName": "sheet_ddr",
    "noSchematicRepresentation": true
  },
  "U3": {
    "schX": 20,
    "schY": 12,
    "schSheetName": "sheet_ddr",
    "noSchematicRepresentation": true
  },
  "C_DDR0": {
    "schX": -27,
    "schY": -10,
    "schSheetName": "sheet_ddr_power",
    "schRotation": 270
  },
  "C_DDR1": {
    "schX": -19.4,
    "schY": -10,
    "schSheetName": "sheet_ddr_power",
    "schRotation": 270
  },
  "C_DDR2": {
    "schX": -11.8,
    "schY": -10,
    "schSheetName": "sheet_ddr_power",
    "schRotation": 270
  },
  "C_DDR3": {
    "schX": -4.2,
    "schY": -10,
    "schSheetName": "sheet_ddr_power",
    "schRotation": 270
  },
  "C_DDR4": {
    "schX": 3.4,
    "schY": -10,
    "schSheetName": "sheet_ddr_power",
    "schRotation": 270
  },
  "C_DDR5": {
    "schX": 11,
    "schY": -10,
    "schSheetName": "sheet_ddr_power",
    "schRotation": 270
  },
  "C_DDR6": {
    "schX": 18.6,
    "schY": -10,
    "schSheetName": "sheet_ddr_power",
    "schRotation": 270
  },
  "C_DDR7": {
    "schX": 26.2,
    "schY": -10,
    "schSheetName": "sheet_ddr_power",
    "schRotation": 270
  },
  "C_DDR8": {
    "schX": -27,
    "schY": -16,
    "schSheetName": "sheet_ddr_power",
    "schRotation": 270
  },
  "C_DDR9": {
    "schX": -19.4,
    "schY": -16,
    "schSheetName": "sheet_ddr_power",
    "schRotation": 270
  },
  "C_DDR10": {
    "schX": -11.8,
    "schY": -16,
    "schSheetName": "sheet_ddr_power",
    "schRotation": 270
  },
  "C_DDR11": {
    "schX": -4.2,
    "schY": -16,
    "schSheetName": "sheet_ddr_power",
    "schRotation": 270
  },
  "C_DDR12": {
    "schX": 3.4,
    "schY": -16,
    "schSheetName": "sheet_ddr_power",
    "schRotation": 270
  },
  "C_DDR13": {
    "schX": 11,
    "schY": -16,
    "schSheetName": "sheet_ddr_power",
    "schRotation": 270
  },
  "C_DDR14": {
    "schX": 18.6,
    "schY": -16,
    "schSheetName": "sheet_ddr_power",
    "schRotation": 270
  },
  "C_DDR15": {
    "schX": 26.2,
    "schY": -16,
    "schSheetName": "sheet_ddr_power",
    "schRotation": 270
  },
  "C_DDR16": {
    "schX": -27,
    "schY": -22,
    "schSheetName": "sheet_ddr_power",
    "schRotation": 270
  },
  "C_DDR17": {
    "schX": -19.4,
    "schY": -22,
    "schSheetName": "sheet_ddr_power",
    "schRotation": 270
  },
  "C_VREF": {
    "schX": -11.8,
    "schY": -22,
    "schSheetName": "sheet_ddr_power",
    "schRotation": 270
  },
  "R_DDR_RST": {
    "schX": -4.2,
    "schY": -22,
    "schSheetName": "sheet_ddr_power",
    "schRotation": 270
  },
  "R_VREF_H": {
    "schX": 3.4,
    "schY": -22,
    "schSheetName": "sheet_ddr_power",
    "schRotation": 270
  },
  "R_VREF_L": {
    "schX": 11,
    "schY": -22,
    "schSheetName": "sheet_ddr_power",
    "schRotation": 270
  },
  "R_VTP": {
    "schX": 18.6,
    "schY": -22,
    "schSheetName": "sheet_ddr_power",
    "schRotation": 270
  },
  "R_ZQ": {
    "schX": 26.2,
    "schY": -22,
    "schSheetName": "sheet_ddr_power",
    "schRotation": 270
  },
  "C_U1_F7": {
    "schX": -8,
    "schY": 12,
    "schSheetName": "schematic_sheet_cpu_power_core",
    "schRotation": 270
  },
  "C_U1_F6": {
    "schX": -3,
    "schY": 12,
    "schSheetName": "schematic_sheet_cpu_power_core",
    "schRotation": 270
  },
  "C_U1_M13": {
    "schX": 2,
    "schY": 12,
    "schSheetName": "schematic_sheet_cpu_power_core",
    "schRotation": 270
  },
  "C_U1_J12": {
    "schX": 7,
    "schY": 12,
    "schSheetName": "schematic_sheet_cpu_power_core",
    "schRotation": 270
  },
  "C_U1_K12": {
    "schX": 12,
    "schY": 12,
    "schSheetName": "schematic_sheet_cpu_power_core",
    "schRotation": 270
  },
  "C_U1_H11": {
    "schX": 17,
    "schY": 12,
    "schSheetName": "schematic_sheet_cpu_power_core",
    "schRotation": 270
  },
  "C_U1_M11": {
    "schX": 22,
    "schY": 12,
    "schSheetName": "schematic_sheet_cpu_power_core",
    "schRotation": 270
  },
  "C_U1_G10": {
    "schX": -8,
    "schY": 6,
    "schSheetName": "schematic_sheet_cpu_power_core",
    "schRotation": 270
  },
  "C_U1_L9": {
    "schX": -3,
    "schY": 6,
    "schSheetName": "schematic_sheet_cpu_power_core",
    "schRotation": 270
  },
  "C_U1_K8": {
    "schX": 2,
    "schY": 6,
    "schSheetName": "schematic_sheet_cpu_power_core",
    "schRotation": 270
  },
  "C_U1_L8": {
    "schX": 7,
    "schY": 6,
    "schSheetName": "schematic_sheet_cpu_power_core",
    "schRotation": 270
  },
  "C_U1_G7": {
    "schX": 12,
    "schY": 6,
    "schSheetName": "schematic_sheet_cpu_power_core",
    "schRotation": 270
  },
  "C_U1_L7": {
    "schX": 17,
    "schY": 6,
    "schSheetName": "schematic_sheet_cpu_power_core",
    "schRotation": 270
  },
  "C_U1_G6": {
    "schX": 22,
    "schY": 6,
    "schSheetName": "schematic_sheet_cpu_power_core",
    "schRotation": 270
  },
  "C_U1_K6": {
    "schX": -8,
    "schY": 0,
    "schSheetName": "schematic_sheet_cpu_power_core",
    "schRotation": 270
  },
  "C_U1_L6": {
    "schX": -3,
    "schY": 0,
    "schSheetName": "schematic_sheet_cpu_power_core",
    "schRotation": 270
  },
  "C_U1_N13": {
    "schX": 2,
    "schY": 0,
    "schSheetName": "schematic_sheet_cpu_power_core",
    "schRotation": 270
  },
  "C_U1_N12": {
    "schX": 7,
    "schY": 0,
    "schSheetName": "schematic_sheet_cpu_power_core",
    "schRotation": 270
  },
  "C_U1_N9": {
    "schX": 12,
    "schY": 0,
    "schSheetName": "schematic_sheet_cpu_power_core",
    "schRotation": 270
  },
  "C_U1_N8": {
    "schX": 17,
    "schY": 0,
    "schSheetName": "schematic_sheet_cpu_power_core",
    "schRotation": 270
  },
  "C_U1_F13": {
    "schX": -8,
    "schY": -10,
    "schSheetName": "schematic_sheet_cpu_power_core",
    "schRotation": 270
  },
  "C_U1_F12": {
    "schX": -3,
    "schY": -10,
    "schSheetName": "schematic_sheet_cpu_power_core",
    "schRotation": 270
  },
  "C_U1_F11": {
    "schX": 2,
    "schY": -10,
    "schSheetName": "schematic_sheet_cpu_power_core",
    "schRotation": 270
  },
  "C_U1_F10": {
    "schX": 7,
    "schY": -10,
    "schSheetName": "schematic_sheet_cpu_power_core",
    "schRotation": 270
  },
  "C_U1_G13": {
    "schX": 12,
    "schY": -10,
    "schSheetName": "schematic_sheet_cpu_power_core",
    "schRotation": 270
  },
  "C_U1_H13": {
    "schX": 17,
    "schY": -10,
    "schSheetName": "schematic_sheet_cpu_power_core",
    "schRotation": 270
  },
  "C_U1_J13": {
    "schX": 22,
    "schY": -10,
    "schSheetName": "schematic_sheet_cpu_power_core",
    "schRotation": 270
  },
  "C_U1_F14": {
    "schX": -8,
    "schY": 12,
    "schSheetName": "schematic_sheet_cpu_power_io",
    "schRotation": 270
  },
  "C_U1_E13": {
    "schX": -3,
    "schY": 12,
    "schSheetName": "schematic_sheet_cpu_power_io",
    "schRotation": 270
  },
  "C_U1_E12": {
    "schX": 2,
    "schY": 12,
    "schSheetName": "schematic_sheet_cpu_power_io",
    "schRotation": 270
  },
  "C_U1_E11": {
    "schX": 7,
    "schY": 12,
    "schSheetName": "schematic_sheet_cpu_power_io",
    "schRotation": 270
  },
  "C_U1_E10": {
    "schX": 12,
    "schY": 12,
    "schSheetName": "schematic_sheet_cpu_power_io",
    "schRotation": 270
  },
  "C_U1_G14": {
    "schX": 17,
    "schY": 12,
    "schSheetName": "schematic_sheet_cpu_power_io",
    "schRotation": 270
  },
  "C_U1_H14": {
    "schX": 22,
    "schY": 12,
    "schSheetName": "schematic_sheet_cpu_power_io",
    "schRotation": 270
  },
  "C_U1_J14": {
    "schX": -8,
    "schY": 6,
    "schSheetName": "schematic_sheet_cpu_power_io",
    "schRotation": 270
  },
  "C_U1_K14": {
    "schX": -3,
    "schY": 6,
    "schSheetName": "schematic_sheet_cpu_power_io",
    "schRotation": 270
  },
  "C_U1_L14": {
    "schX": 2,
    "schY": 6,
    "schSheetName": "schematic_sheet_cpu_power_io",
    "schRotation": 270
  },
  "C_U1_P13": {
    "schX": 7,
    "schY": 6,
    "schSheetName": "schematic_sheet_cpu_power_io",
    "schRotation": 270
  },
  "C_U1_P12": {
    "schX": 12,
    "schY": 6,
    "schSheetName": "schematic_sheet_cpu_power_io",
    "schRotation": 270
  },
  "C_U1_P11": {
    "schX": 17,
    "schY": 6,
    "schSheetName": "schematic_sheet_cpu_power_io",
    "schRotation": 270
  },
  "C_U1_P10": {
    "schX": 22,
    "schY": 6,
    "schSheetName": "schematic_sheet_cpu_power_io",
    "schRotation": 270
  },
  "C_U1_P8": {
    "schX": -8,
    "schY": 0,
    "schSheetName": "schematic_sheet_cpu_power_io",
    "schRotation": 270
  },
  "C_U1_P7": {
    "schX": -3,
    "schY": 0,
    "schSheetName": "schematic_sheet_cpu_power_io",
    "schRotation": 270
  },
  "C_U1_P6": {
    "schX": 2,
    "schY": 0,
    "schSheetName": "schematic_sheet_cpu_power_io",
    "schRotation": 270
  },
  "C_U1_N5": {
    "schX": 7,
    "schY": 0,
    "schSheetName": "schematic_sheet_cpu_power_io",
    "schRotation": 270
  },
  "C_U1_P5": {
    "schX": 12,
    "schY": 0,
    "schSheetName": "schematic_sheet_cpu_power_io",
    "schRotation": 270
  },
  "C_U1_E14": {
    "schX": -8,
    "schY": -6,
    "schSheetName": "schematic_sheet_cpu_power_io",
    "schRotation": 270
  },
  "C_U1_D10": {
    "schX": -3,
    "schY": -6,
    "schSheetName": "schematic_sheet_cpu_power_io",
    "schRotation": 270
  },
  "C_U1_E9": {
    "schX": 2,
    "schY": -6,
    "schSheetName": "schematic_sheet_cpu_power_io",
    "schRotation": 270
  },
  "C_U1_F9": {
    "schX": 7,
    "schY": -6,
    "schSheetName": "schematic_sheet_cpu_power_io",
    "schRotation": 270
  },
  "C_U1_D8": {
    "schX": 12,
    "schY": -6,
    "schSheetName": "schematic_sheet_cpu_power_io",
    "schRotation": 270
  },
  "C_U1_E7": {
    "schX": 17,
    "schY": -6,
    "schSheetName": "schematic_sheet_cpu_power_io",
    "schRotation": 270
  },
  "C_U1_E6": {
    "schX": 22,
    "schY": -6,
    "schSheetName": "schematic_sheet_cpu_power_io",
    "schRotation": 270
  },
  "C_U1_H15": {
    "schX": -8,
    "schY": -12,
    "schSheetName": "schematic_sheet_cpu_power_io",
    "schRotation": 270
  },
  "C_U1_K13": {
    "schX": -3,
    "schY": -12,
    "schSheetName": "schematic_sheet_cpu_power_io",
    "schRotation": 270
  },
  "C_U1_N16": {
    "schX": 2,
    "schY": -12,
    "schSheetName": "schematic_sheet_cpu_power_io",
    "schRotation": 270
  },
  "C_U1_R16": {
    "schX": 7,
    "schY": -12,
    "schSheetName": "schematic_sheet_cpu_power_io",
    "schRotation": 270
  },
  "C_U1_P14": {
    "schX": 12,
    "schY": -12,
    "schSheetName": "schematic_sheet_cpu_power_io",
    "schRotation": 270
  },
  "C_U1_R11": {
    "schX": 17,
    "schY": -12,
    "schSheetName": "schematic_sheet_cpu_power_io",
    "schRotation": 270
  },
  "C_U1_R10": {
    "schX": 22,
    "schY": -12,
    "schSheetName": "schematic_sheet_cpu_power_io",
    "schRotation": 270
  },
  "C_U1_P9": {
    "schX": -8,
    "schY": -18,
    "schSheetName": "schematic_sheet_cpu_power_io",
    "schRotation": 270
  },
  "C_U1_N6": {
    "schX": -3,
    "schY": -18,
    "schSheetName": "schematic_sheet_cpu_power_io",
    "schRotation": 270
  },
  "C_U1_E5": {
    "schX": -8,
    "schY": 10,
    "schSheetName": "schematic_sheet_cpu_power_aux",
    "schRotation": 270
  },
  "C_U1_F5": {
    "schX": -3,
    "schY": 10,
    "schSheetName": "schematic_sheet_cpu_power_aux",
    "schRotation": 270
  },
  "C_U1_G5": {
    "schX": 2,
    "schY": 10,
    "schSheetName": "schematic_sheet_cpu_power_aux",
    "schRotation": 270
  },
  "C_U1_H5": {
    "schX": 7,
    "schY": 10,
    "schSheetName": "schematic_sheet_cpu_power_aux",
    "schRotation": 270
  },
  "C_U1_J5": {
    "schX": 12,
    "schY": 10,
    "schSheetName": "schematic_sheet_cpu_power_aux",
    "schRotation": 270
  },
  "C_U1_K5": {
    "schX": 17,
    "schY": 10,
    "schSheetName": "schematic_sheet_cpu_power_aux",
    "schRotation": 270
  },
  "C_U1_L5": {
    "schX": 22,
    "schY": 10,
    "schSheetName": "schematic_sheet_cpu_power_aux",
    "schRotation": 270
  },
  "C_U1_D7": {
    "schX": -8,
    "schY": 0,
    "schSheetName": "schematic_sheet_cpu_power_aux",
    "schRotation": 270
  },
  "C_U1_N15": {
    "schX": -3,
    "schY": 0,
    "schSheetName": "schematic_sheet_cpu_power_aux",
    "schRotation": 270
  },
  "C_U1_R15": {
    "schX": 2,
    "schY": 0,
    "schSheetName": "schematic_sheet_cpu_power_aux",
    "schRotation": 270
  },
  "C_CAP0": {
    "schX": -8,
    "schY": -13,
    "schSheetName": "schematic_sheet_cpu_power_aux",
    "schRotation": 270
  },
  "C_CAP1": {
    "schX": -0.5,
    "schY": -13,
    "schSheetName": "schematic_sheet_cpu_power_aux",
    "schRotation": 270
  },
  "C_CAP2": {
    "schX": 7,
    "schY": -13,
    "schSheetName": "schematic_sheet_cpu_power_aux",
    "schRotation": 270
  },
  "C_CAP3": {
    "schX": 14.5,
    "schY": -13,
    "schSheetName": "schematic_sheet_cpu_power_aux",
    "schRotation": 270
  },
  "C_RTCX1": {
    "schX": 3,
    "schY": 13,
    "schSheetName": "sheet_clock_control",
    "schRotation": 270
  },
  "C_RTCX2": {
    "schX": 11,
    "schY": 13,
    "schSheetName": "sheet_clock_control",
    "schRotation": 270
  },
  "C_X1": {
    "schX": 19,
    "schY": 13,
    "schSheetName": "sheet_clock_control",
    "schRotation": 270
  },
  "C_X2": {
    "schX": 3,
    "schY": 5,
    "schSheetName": "sheet_clock_control",
    "schRotation": 270
  },
  "Y1": {
    "schX": 11,
    "schY": 5,
    "schSheetName": "sheet_clock_control",
    "schRotation": 270
  },
  "Y2": {
    "schX": 19,
    "schY": 5,
    "schSheetName": "sheet_clock_control",
    "schRotation": 270
  },
  "R_CTRL0": {
    "schX": -26,
    "schY": -3,
    "schSheetName": "sheet_clock_control",
    "schRotation": 90
  },
  "R_CTRL1": {
    "schX": -17,
    "schY": -3,
    "schSheetName": "sheet_clock_control",
    "schRotation": 90
  },
  "R_CTRL2": {
    "schX": -8,
    "schY": -3,
    "schSheetName": "sheet_clock_control",
    "schRotation": 90
  },
  "R_CTRL3": {
    "schX": 1,
    "schY": -3,
    "schSheetName": "sheet_clock_control",
    "schRotation": 90
  },
  "R_RTC_RST": {
    "schX": 10,
    "schY": -3,
    "schSheetName": "sheet_clock_control",
    "schRotation": 90
  },
  "J_RESET": {
    "schX": 19,
    "schY": -3,
    "schSheetName": "sheet_clock_control",
    "schWidth": 4,
    "schHeight": 2.5,
    "schPinArrangement": {
      "rightSide": {
        "pins": [
          1,
          2
        ],
        "direction": "top-to-bottom"
      }
    },
    "schPinStyle": {
      "pin2": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin1": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  "R_BOOT0": {
    "schX": -26,
    "schY": -13.5,
    "schSheetName": "sheet_clock_control",
    "schRotation": 90
  },
  "R_BOOT1": {
    "schX": -18.4,
    "schY": -13.5,
    "schSheetName": "sheet_clock_control",
    "schRotation": 90
  },
  "R_BOOT2": {
    "schX": -10.8,
    "schY": -13.5,
    "schSheetName": "sheet_clock_control",
    "schRotation": 90
  },
  "R_BOOT3": {
    "schX": -3.2,
    "schY": -13.5,
    "schSheetName": "sheet_clock_control",
    "schRotation": 270
  },
  "R_BOOT4": {
    "schX": 4.4,
    "schY": -13.5,
    "schSheetName": "sheet_clock_control",
    "schRotation": 90
  },
  "R_BOOT5": {
    "schX": 12,
    "schY": -13.5,
    "schSheetName": "sheet_clock_control",
    "schRotation": 270
  },
  "R_BOOT6": {
    "schX": 19.6,
    "schY": -13.5,
    "schSheetName": "sheet_clock_control",
    "schRotation": 270
  },
  "R_BOOT7": {
    "schX": 27.2,
    "schY": -13.5,
    "schSheetName": "sheet_clock_control",
    "schRotation": 270
  },
  "R_BOOT8": {
    "schX": -26,
    "schY": -19.5,
    "schSheetName": "sheet_clock_control",
    "schRotation": 270
  },
  "R_BOOT9": {
    "schX": -18.4,
    "schY": -19.5,
    "schSheetName": "sheet_clock_control",
    "schRotation": 270
  },
  "R_BOOT10": {
    "schX": -10.8,
    "schY": -19.5,
    "schSheetName": "sheet_clock_control",
    "schRotation": 270
  },
  "R_BOOT11": {
    "schX": -3.2,
    "schY": -19.5,
    "schSheetName": "sheet_clock_control",
    "schRotation": 270
  },
  "R_BOOT12": {
    "schX": 4.4,
    "schY": -19.5,
    "schSheetName": "sheet_clock_control",
    "schRotation": 270
  },
  "R_BOOT13": {
    "schX": 12,
    "schY": -19.5,
    "schSheetName": "sheet_clock_control",
    "schRotation": 270
  },
  "R_BOOT14": {
    "schX": 19.6,
    "schY": -19.5,
    "schSheetName": "sheet_clock_control",
    "schRotation": 90
  },
  "R_BOOT15": {
    "schX": 27.2,
    "schY": -19.5,
    "schSheetName": "sheet_clock_control",
    "schRotation": 270
  },
  "U_USB_PWR": {
    "schX": -24,
    "schY": -5,
    "schSheetName": "sheet_usb",
    "schWidth": 9,
    "schHeight": 3.5500000000000003,
    "schPinArrangement": {
      "leftSide": {
        "pins": [
          1,
          3,
          8,
          7
        ],
        "direction": "top-to-bottom"
      },
      "rightSide": {
        "pins": [
          4,
          5,
          6,
          2
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
      "pin8": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin7": {
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
      "pin6": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin2": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  "U_USB_ESD0": {
    "schX": 0,
    "schY": 13,
    "schSheetName": "sheet_usb",
    "schWidth": 8,
    "schHeight": 2.9000000000000004,
    "schPinArrangement": {
      "leftSide": {
        "pins": [
          2,
          3,
          4
        ],
        "direction": "top-to-bottom"
      },
      "rightSide": {
        "pins": [
          1,
          6,
          5
        ],
        "direction": "top-to-bottom"
      }
    },
    "schPinStyle": {
      "pin2": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin3": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin4": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin1": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin6": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin5": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  "J_USB0": {
    "schX": 24,
    "schY": 13,
    "schSheetName": "sheet_usb",
    "schWidth": 8,
    "schHeight": 3.4,
    "schPinArrangement": {
      "leftSide": {
        "pins": [
          4,
          5,
          6
        ],
        "direction": "top-to-bottom"
      },
      "rightSide": {
        "pins": [
          2,
          3,
          1
        ],
        "direction": "top-to-bottom"
      }
    },
    "schPinStyle": {
      "pin4": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin5": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin2": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin3": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin1": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  "U_USB_ESD1": {
    "schX": 0,
    "schY": -7,
    "schSheetName": "sheet_usb",
    "schWidth": 8,
    "schHeight": 2.9000000000000004,
    "schPinArrangement": {
      "leftSide": {
        "pins": [
          2,
          3,
          4
        ],
        "direction": "top-to-bottom"
      },
      "rightSide": {
        "pins": [
          1,
          6,
          5
        ],
        "direction": "top-to-bottom"
      }
    },
    "schPinStyle": {
      "pin2": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin3": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin4": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin1": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin6": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin5": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  "J_USB1": {
    "schX": 24,
    "schY": -7,
    "schSheetName": "sheet_usb",
    "schWidth": 8,
    "schHeight": 3.4,
    "schPinArrangement": {
      "leftSide": {
        "pins": [
          4,
          5,
          6
        ],
        "direction": "top-to-bottom"
      },
      "rightSide": {
        "pins": [
          2,
          3,
          1
        ],
        "direction": "top-to-bottom"
      }
    },
    "schPinStyle": {
      "pin4": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin5": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin2": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin3": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin1": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  "C_USB_BULK0": {
    "schX": -29,
    "schY": -20,
    "schSheetName": "sheet_usb",
    "schRotation": 270
  },
  "C_USB_BULK1": {
    "schX": -20.8,
    "schY": -20,
    "schSheetName": "sheet_usb",
    "schRotation": 270
  },
  "C_USB_ESD0": {
    "schX": -12.6,
    "schY": -20,
    "schSheetName": "sheet_usb",
    "schRotation": 270
  },
  "C_USB_ESD1": {
    "schX": -4.4,
    "schY": -20,
    "schSheetName": "sheet_usb",
    "schRotation": 270
  },
  "C_USB_PWR": {
    "schX": 3.8,
    "schY": -20,
    "schSheetName": "sheet_usb",
    "schRotation": 270
  },
  "R_USB_EN0": {
    "schX": 12,
    "schY": -20,
    "schSheetName": "sheet_usb",
    "schRotation": 270
  },
  "R_USB_EN1": {
    "schX": 20.2,
    "schY": -20,
    "schSheetName": "sheet_usb",
    "schRotation": 270
  },
  "R_USB_OC0": {
    "schX": 28.4,
    "schY": -20,
    "schSheetName": "sheet_usb",
    "schRotation": 90
  },
  "R_USB_OC1": {
    "schX": -29,
    "schY": -26,
    "schSheetName": "sheet_usb",
    "schRotation": 90
  },
  "U_HDMI": {
    "schX": 2,
    "schY": 14,
    "schSheetName": "sheet_video",
    "noSchematicRepresentation": true
  },
  "C_HDMI0": {
    "schX": -1,
    "schY": -6,
    "schSheetName": "sheet_video",
    "schRotation": 270
  },
  "C_HDMI1": {
    "schX": 7,
    "schY": -6,
    "schSheetName": "sheet_video",
    "schRotation": 270
  },
  "C_HDMI2": {
    "schX": 15,
    "schY": -6,
    "schSheetName": "sheet_video",
    "schRotation": 270
  },
  "C_HDMI3": {
    "schX": 23,
    "schY": -6,
    "schSheetName": "sheet_video",
    "schRotation": 270
  },
  "C_HDMI4": {
    "schX": -1,
    "schY": -12,
    "schSheetName": "sheet_video",
    "schRotation": 270
  },
  "C_HDMI5": {
    "schX": 7,
    "schY": -12,
    "schSheetName": "sheet_video",
    "schRotation": 270
  },
  "FB_HDMI0": {
    "schX": 15,
    "schY": -12,
    "schSheetName": "sheet_video"
  },
  "FB_HDMI1": {
    "schX": 23,
    "schY": -12,
    "schSheetName": "sheet_video"
  },
  "R_TFADJ": {
    "schX": -1,
    "schY": -18,
    "schSheetName": "sheet_video",
    "schRotation": 270
  },
  "U_HDMI_ESD": {
    "schX": -25,
    "schY": 10,
    "schSheetName": "sheet_hdmi",
    "noSchematicRepresentation": true
  },
  "J_HDMI": {
    "schX": 25,
    "schY": 10,
    "schSheetName": "sheet_hdmi",
    "schWidth": 9,
    "schHeight": 8.75,
    "schPinArrangement": {
      "leftSide": {
        "pins": [
          13,
          2,
          5,
          8,
          11,
          17,
          20,
          21,
          22,
          23,
          18,
          19
        ],
        "direction": "top-to-bottom"
      },
      "rightSide": {
        "pins": [
          15,
          16,
          14,
          12,
          10,
          9,
          7,
          6,
          4,
          3,
          1
        ],
        "direction": "top-to-bottom"
      }
    },
    "schPinStyle": {
      "pin13": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin2": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
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
      "pin17": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin20": {
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
      "pin23": {
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
      "pin15": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin16": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin14": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin12": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin10": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin9": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin7": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin6": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin4": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin3": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin1": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  "C_HDMI_5V": {
    "schX": -29,
    "schY": -12,
    "schSheetName": "sheet_hdmi",
    "schRotation": 270
  },
  "C_HDMI_BULK0": {
    "schX": -20.8,
    "schY": -12,
    "schSheetName": "sheet_hdmi",
    "schRotation": 270
  },
  "C_HDMI_BULK1": {
    "schX": -12.6,
    "schY": -12,
    "schSheetName": "sheet_hdmi",
    "schRotation": 270
  },
  "C_HDMI_ESD": {
    "schX": -4.4,
    "schY": -12,
    "schSheetName": "sheet_hdmi",
    "schRotation": 270
  },
  "C_HDMI_LV": {
    "schX": 3.8,
    "schY": -12,
    "schSheetName": "sheet_hdmi",
    "schRotation": 270
  },
  "C_HDMI_SUPPLY": {
    "schX": 12,
    "schY": -12,
    "schSheetName": "sheet_hdmi",
    "schRotation": 270
  },
  "R_HDMI_HPD": {
    "schX": 20.2,
    "schY": -12,
    "schSheetName": "sheet_hdmi",
    "schRotation": 270
  },
  "R_HDMI_HPD_LV": {
    "schX": 28.4,
    "schY": -12,
    "schSheetName": "sheet_hdmi",
    "schRotation": 90
  },
  "R_HDMI_SCL": {
    "schX": -29,
    "schY": -18,
    "schSheetName": "sheet_hdmi",
    "schRotation": 90
  },
  "R_HDMI_SDA": {
    "schX": -20.8,
    "schY": -18,
    "schSheetName": "sheet_hdmi",
    "schRotation": 90
  },
  "J_SD": {
    "schX": -6,
    "schY": 18,
    "schSheetName": "sheet_io",
    "schWidth": 10,
    "schHeight": 5.5,
    "schPinArrangement": {
      "leftSide": {
        "pins": [
          6,
          10,
          11,
          12,
          13,
          5,
          3
        ],
        "direction": "top-to-bottom"
      },
      "rightSide": {
        "pins": [
          7,
          8,
          1,
          2,
          9,
          4
        ],
        "direction": "top-to-bottom"
      }
    },
    "schPinStyle": {
      "pin6": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin10": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin11": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin12": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin13": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin5": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin3": {
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
      "pin1": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin2": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin9": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin4": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  "J_JTAG": {
    "schX": 28,
    "schY": 18,
    "schSheetName": "sheet_io",
    "schWidth": 12,
    "schHeight": 7.450000000000001,
    "schPinArrangement": {
      "leftSide": {
        "pins": [
          1,
          3,
          5,
          7,
          9,
          11,
          13,
          15,
          17,
          19
        ],
        "direction": "top-to-bottom"
      },
      "rightSide": {
        "pins": [
          2,
          4,
          6,
          8,
          10,
          12,
          14,
          16,
          18,
          20
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
      "pin5": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin7": {
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
      "pin13": {
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
      "pin19": {
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
      "pin6": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin8": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin10": {
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
      "pin18": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin20": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  "R_UART_RX": {
    "schX": -31,
    "schY": -4,
    "schSheetName": "sheet_io",
    "schRotation": 270
  },
  "R_UART_TX": {
    "schX": -19,
    "schY": -4,
    "schSheetName": "sheet_io",
    "schRotation": 270
  },
  "U_UARTBUF": {
    "schX": 1,
    "schY": -4,
    "schSheetName": "sheet_io",
    "schWidth": 12,
    "schHeight": 4.3,
    "schPinArrangement": {
      "leftSide": {
        "pins": [
          1,
          2,
          5,
          7
        ],
        "direction": "top-to-bottom"
      },
      "rightSide": {
        "pins": [
          8,
          6,
          3,
          4
        ],
        "direction": "top-to-bottom"
      }
    },
    "schPinStyle": {
      "pin1": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin2": {
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
      "pin8": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin6": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin3": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin4": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  "C_UARTBUF": {
    "schX": 14,
    "schY": -4,
    "schSheetName": "sheet_io",
    "schRotation": 270
  },
  "J_UART": {
    "schX": 30,
    "schY": -4,
    "schSheetName": "sheet_io",
    "schWidth": 13,
    "schHeight": 2.9000000000000004,
    "schPinArrangement": {
      "leftSide": {
        "pins": [
          1,
          2,
          3
        ],
        "direction": "top-to-bottom"
      }
    },
    "schPinStyle": {
      "pin1": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin2": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin3": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  "C_SD": {
    "schX": -34,
    "schY": -17,
    "schSheetName": "sheet_io",
    "schRotation": 270
  },
  "R_CTRL4": {
    "schX": -24.8,
    "schY": -17,
    "schSheetName": "sheet_io",
    "schRotation": 90
  },
  "R_CTRL5": {
    "schX": -15.6,
    "schY": -17,
    "schSheetName": "sheet_io",
    "schRotation": 90
  },
  "R_CTRL6": {
    "schX": -6.4,
    "schY": -17,
    "schSheetName": "sheet_io",
    "schRotation": 90
  },
  "R_SD0": {
    "schX": 2.8,
    "schY": -17,
    "schSheetName": "sheet_io",
    "schRotation": 90
  },
  "R_SD1": {
    "schX": 12,
    "schY": -17,
    "schSheetName": "sheet_io",
    "schRotation": 90
  },
  "R_SD2": {
    "schX": 21.2,
    "schY": -17,
    "schSheetName": "sheet_io",
    "schRotation": 90
  },
  "R_SD3": {
    "schX": 30.4,
    "schY": -17,
    "schSheetName": "sheet_io",
    "schRotation": 90
  },
  "R_SD4": {
    "schX": -34,
    "schY": -23,
    "schSheetName": "sheet_io",
    "schRotation": 90
  },
  "R_SD5": {
    "schX": -24.8,
    "schY": -23,
    "schSheetName": "sheet_io",
    "schRotation": 90
  },
  "U_RGB_BUF": {
    "schX": -3,
    "schY": 9,
    "schSheetName": "sheet_indicators",
    "schWidth": 9,
    "schHeight": 2.9000000000000004,
    "schPinArrangement": {
      "leftSide": {
        "pins": [
          1,
          3,
          4
        ],
        "direction": "top-to-bottom"
      },
      "rightSide": {
        "pins": [
          2,
          5
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
      "pin4": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin2": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin5": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  "D_RGB0": {
    "schX": 14,
    "schY": 9,
    "schSheetName": "sheet_indicators",
    "schWidth": 6,
    "schHeight": 2.5,
    "schPinArrangement": {
      "leftSide": {
        "pins": [
          2,
          1
        ],
        "direction": "top-to-bottom"
      },
      "rightSide": {
        "pins": [
          3,
          4
        ],
        "direction": "top-to-bottom"
      }
    },
    "schPinStyle": {
      "pin2": {
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
      "pin4": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  "D_RGB1": {
    "schX": 28,
    "schY": 9,
    "schSheetName": "sheet_indicators",
    "schWidth": 6,
    "schHeight": 2.5,
    "schPinArrangement": {
      "leftSide": {
        "pins": [
          1,
          2
        ],
        "direction": "top-to-bottom"
      },
      "rightSide": {
        "pins": [
          3,
          4
        ],
        "direction": "top-to-bottom"
      }
    },
    "schPinStyle": {
      "pin1": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin2": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin3": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      },
      "pin4": {
        "marginTop": 0.225,
        "marginBottom": 0.225
      }
    }
  },
  "Q_BUZZ": {
    "schX": -23,
    "schY": -8,
    "schSheetName": "sheet_indicators"
  },
  "BZ1": {
    "schX": -6,
    "schY": -8,
    "schSheetName": "sheet_indicators"
  },
  "C_RGB_BUF": {
    "schX": 3,
    "schY": -6,
    "schSheetName": "sheet_indicators",
    "schRotation": 270
  },
  "C_RGB0": {
    "schX": 11,
    "schY": -6,
    "schSheetName": "sheet_indicators",
    "schRotation": 270
  },
  "C_RGB1": {
    "schX": 19,
    "schY": -6,
    "schSheetName": "sheet_indicators",
    "schRotation": 270
  },
  "R_BUZZ_BLEED": {
    "schX": 27,
    "schY": -6,
    "schSheetName": "sheet_indicators",
    "schRotation": 90
  },
  "R_BUZZ_GATE": {
    "schX": 3,
    "schY": -13,
    "schSheetName": "sheet_indicators",
    "schRotation": 270
  },
  "R_BUZZ_OFF": {
    "schX": 11,
    "schY": -13,
    "schSheetName": "sheet_indicators",
    "schRotation": 270
  },
  "R_RGB_DATA": {
    "schX": 19,
    "schY": -13,
    "schSheetName": "sheet_indicators",
    "schRotation": 270
  },
  "R_RGB_IN": {
    "schX": 27,
    "schY": -13,
    "schSheetName": "sheet_indicators",
    "schRotation": 270
  }
}

/** Physical package pins intentionally unused in this board's source netlist. */
export const unusedPins = {
  "U1": [
    "pin37",
    "pin40",
    "pin44",
    "pin62",
    "pin75",
    "pin92",
    "pin106",
    "pin107",
    "pin108",
    "pin109",
    "pin110",
    "pin111",
    "pin123",
    "pin124",
    "pin125",
    "pin126",
    "pin127",
    "pin128",
    "pin129",
    "pin141",
    "pin142",
    "pin143",
    "pin144",
    "pin147",
    "pin159",
    "pin160",
    "pin161",
    "pin162",
    "pin178",
    "pin179",
    "pin196",
    "pin200",
    "pin201",
    "pin202",
    "pin213",
    "pin214",
    "pin215",
    "pin216",
    "pin217",
    "pin218",
    "pin219",
    "pin220",
    "pin232",
    "pin233",
    "pin234",
    "pin235",
    "pin238",
    "pin249",
    "pin251",
    "pin252",
    "pin253",
    "pin255",
    "pin256",
    "pin261",
    "pin262",
    "pin263",
    "pin264",
    "pin268",
    "pin269",
    "pin270",
    "pin271",
    "pin272",
    "pin274",
    "pin278",
    "pin279",
    "pin280",
    "pin281",
    "pin282",
    "pin286",
    "pin287",
    "pin288",
    "pin289",
    "pin292",
    "pin293",
    "pin296",
    "pin297",
    "pin298",
    "pin299",
    "pin300",
    "pin304",
    "pin305",
    "pin308",
    "pin310",
    "pin311",
    "pin314",
    "pin315",
    "pin316",
    "pin317",
    "pin318",
    "pin320",
    "pin323"
  ],
  "U2": [
    "pin4",
    "pin5",
    "pin6",
    "pin13",
    "pin14",
    "pin15",
    "pin16",
    "pin17",
    "pin33",
    "pin34",
    "pin35",
    "pin36",
    "pin37",
    "pin38",
    "pin45",
    "pin46"
  ],
  "U3": [
    "pin9",
    "pin11",
    "pin48",
    "pin60",
    "pin64",
    "pin89",
    "pin91"
  ]
} as const

export function sch<Name extends keyof typeof unusedPins>(name: Name):
  SchematicPlacement & { noConnect: (typeof unusedPins)[Name] }
export function sch(name: string): SchematicPlacement
export function sch(name: string): SchematicPlacement & { noConnect?: readonly string[] } {
  const placement = placements[name]
  if (!placement) throw new Error(`Missing schematic placement for ${name}`)
  if (name === "U1" || name === "U2" || name === "U3") {
    return { ...placement, noConnect: unusedPins[name] }
  }
  return placement
}
