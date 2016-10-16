COMPDIR=$1
COMPNAME=$2
COMPPATH=$1/$2

cat > $COMPPATH.component.js << EOF
import templateUrl from './${COMPNAME}.html';

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

echo $COMPNAME > $COMPPATH.html

cat << EOF
Remember to edit ${COMPDIR}/index.js and add

import ${COMPNAME} from './${COMPNAME}.component';

and,

  .component('${COMPNAME}', ${COMPNAME})

EOF
