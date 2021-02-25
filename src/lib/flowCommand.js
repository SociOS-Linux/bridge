// looks into the GET parameters and attempts to construct a "flow" object,
// which would indicate bridge is to be used for one specific flow.
// expects to find any of the following sets of parameters, varying by kind.
//
// ? kind = btc
// & utx  = somebase64string
//

const COMMANDS = {
  BITCOIN: 'btc',
};

const useFlowCommand = () => {
  let flow = {};
  window.location.search
    .substr(1)
    .split('&')
    .forEach(arg => {
      if ('' === arg) return;
      const pam = arg.split('=');
      flow[pam[0]] = pam.length <= 1 ? true : decodeURIComponent(pam[1]);
    });

  if (typeof flow === 'object') {
    switch (flow.kind) {
      case COMMANDS.BITCOIN:
        try {
          atob(flow.utx);
        } catch (e) {
          flow = null;
        }
        break;
      //
      default:
        console.log('unrecognized kind of flow:', flow.kind);
      // eslint-disable-next-line no-fallthrough
      case undefined:
        flow = null;
        break;
    }
  } else {
    flow = null;
  }

  return flow;
};

export { COMMANDS, useFlowCommand };