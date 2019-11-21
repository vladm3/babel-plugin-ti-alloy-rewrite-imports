const {
  transformRelativeRequiredPathToTIRequiredPath,
} = require('./utils');

module.exports = ({ types: t }) => {
  return {
    visitor: {
      CallExpression: (path, state) => {
        const { node } = path;
        // exit if it's not a require node or its argument is not a string
        if (node.callee.name !== 'require' || !t.isStringLiteral(node.arguments[0])) {
          return;
        }

        // replace require argument
        node.arguments[0] = t.stringLiteral(transformRelativeRequiredPathToTIRequiredPath(
          node.arguments[0].value,
          state
        ));
      },
      ImportDeclaration: (path, state) => {
        const { node } = path;
        // exit if import's source is not a string
        if (!t.isStringLiteral(node.source)) {
          return;
        }

        // replace import source
        node.source = t.stringLiteral(transformRelativeRequiredPathToTIRequiredPath(
          node.source.value,
          state
        ));
      },
    },
  };
};
