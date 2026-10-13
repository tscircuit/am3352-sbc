import { Fragment } from "react"
import { notes, pinBanks, sheets } from "./sheets"

/** Native tscircuit schematic sheets; these add no physical components or traces. */
export function Schematic() {
  return <>
    {sheets.map((sheet) => (
      <Fragment key={sheet.name}>
        <schematicsheet {...sheet}>
          {notes.filter((note) => note.sheetName === sheet.name).map(({ sheetName, ...note }, index) => (
            <Fragment key={`${sheetName}_note_${index}`}>
              <schematictext {...note} />
            </Fragment>
          ))}
          {pinBanks.filter((bank) => bank.schSheetName === sheet.name).map((bank) => (
            <Fragment key={bank.name}>
              <schematicbox {...bank} />
            </Fragment>
          ))}
        </schematicsheet>
      </Fragment>
    ))}
  </>
}
