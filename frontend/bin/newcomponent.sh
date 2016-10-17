#!/bin/sh

MODDIR=$1
COMPNAME=$2
COMPDIR=$1/$2

function show_usage() {
  echo "Usage: $0 ./path/to/module compNameCamelCase"
  exit 1
}

[[ $COMPNAME == "" || $MODDIR == "" ]] && show_usage;

mkdir -p $COMPDIR

cat > $COMPDIR/index.js << EOF
import templateUrl from './${COMPNAME}.html';
import './${COMPNAME}.scss';

export default {
  templateUrl,
  controller: class {
    constructor() {
      'ngInject';
    }

    \$onInit() {
      'ngInject';
    }
  }
}
EOF

cat > $COMPDIR/$COMPNAME.scss << EOF
// FIXME change ${COMPNAME} to snake case later
${COMPNAME} {
}
EOF

echo $COMPNAME > $COMPDIR/$COMPNAME.html

cat << EOF
Remember to edit ${MODDIR}/index.js and add

import ${COMPNAME} from './${COMPNAME}';

and,

  .component('${COMPNAME}', ${COMPNAME})

EOF
