import {DogboneAutorouter} from "./dogbone/dogbone-autorouter"
/** Reserve the tight CPU LCD escapes before DDR occupies their approach space.
 * Native DogboneAutorouter chooses every via site and trace segment. */
export async function createEarlyLcdEscapes(input:any) {
 return new DogboneAutorouter({input,fanoutRoutingLayers:["bottom"]})
}
