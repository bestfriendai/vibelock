/**
 * Babel Plugin: Hermes Property Safety
 * Transforms Object.defineProperty calls to be safer in Hermes engine
 */

module.exports = function ({ types: t }) {
  return {
    name: "hermes-property-safety",
    visitor: {
      CallExpression(path, state) {
        const { node } = path;
        const { opts = {} } = state;

        // Check if this is an Object.defineProperty call
        if (
          t.isMemberExpression(node.callee) &&
          t.isIdentifier(node.callee.object, { name: "Object" }) &&
          t.isIdentifier(node.callee.property, { name: "defineProperty" })
        ) {
          // Only transform if wrapDefineProperty option is enabled
          if (opts.wrapDefineProperty) {
            this.transformDefineProperty(path, opts);
          }
        }

        // Transform property access patterns that might cause issues in Hermes
        if (
          t.isMemberExpression(node.callee) &&
          node.callee.property &&
          t.isIdentifier(node.callee.property, { name: "prototype" })
        ) {
          this.addPrototypeAccessSafety(path, opts);
        }
      },

      // Transform global property assignments
      AssignmentExpression(path, state) {
        const { node } = path;
        const { opts = {} } = state;

        // Check for global property assignments (global.xyz = ...)
        if (
          t.isMemberExpression(node.left) &&
          t.isIdentifier(node.left.object) &&
          ["global", "globalThis", "window"].includes(node.left.object.name)
        ) {
          if (opts.addConfigurabilityChecks) {
            this.addGlobalAssignmentSafety(path, opts);
          }
        }
      },
    },

    transformDefineProperty(path, opts) {
      const { node } = path;
      const [target, property, descriptor] = node.arguments;

      if (!target || !property || !descriptor) {
        return; // Invalid defineProperty call, skip
      }

      // Create a safe wrapper for defineProperty
      const safeDefinePropertyCall = t.callExpression(
        t.memberExpression(t.identifier("global"), t.identifier("__hermesDefinePropertySafe")),
        [target, property, descriptor],
      );

      // Add a fallback in case the safe function doesn't exist
      const conditionalCall = t.conditionalExpression(
        // Check if our safe function exists
        t.logicalExpression(
          "&&",
          t.identifier("global"),
          t.memberExpression(t.identifier("global"), t.identifier("__hermesDefinePropertySafe")),
        ),
        // Use safe function if available
        safeDefinePropertyCall,
        // Fall back to original call
        node,
      );

      // Wrap in try-catch for extra safety
      const tryStatement = t.tryStatement(
        t.blockStatement([t.expressionStatement(conditionalCall)]),
        t.catchClause(
          t.identifier("error"),
          t.blockStatement([
            // Log the error
            t.expressionStatement(
              t.callExpression(t.memberExpression(t.identifier("console"), t.identifier("warn")), [
                t.stringLiteral("[Hermes] Property definition failed:"),
                t.identifier("error"),
              ]),
            ),
          ]),
        ),
      );

      // Replace the call expression with our safe version
      path.replaceWith(
        t.callExpression(
          t.arrowFunctionExpression([], t.blockStatement([tryStatement, t.returnStatement(target)])),
          [],
        ),
      );
    },

    addPrototypeAccessSafety(path, opts) {
      const { node } = path;

      // Wrap prototype access in safety checks
      const safeAccess = t.conditionalExpression(
        // Check if the object and its prototype exist
        t.logicalExpression(
          "&&",
          node.callee.object,
          t.memberExpression(node.callee.object, t.identifier("prototype")),
        ),
        // Original call if safe
        node,
        // Return undefined if not safe
        t.identifier("undefined"),
      );

      path.replaceWith(safeAccess);
    },

    addGlobalAssignmentSafety(path, opts) {
      const { node } = path;

      // Create a conditional assignment that checks if the property is configurable
      const propertyName = t.isIdentifier(node.left.property)
        ? t.stringLiteral(node.left.property.name)
        : node.left.property;

      const configurabilityCheck = t.conditionalExpression(
        // Check if property is configurable or doesn't exist
        t.logicalExpression(
          "||",
          // Property doesn't exist
          t.unaryExpression(
            "!",
            t.callExpression(t.memberExpression(t.identifier("Object"), t.identifier("hasOwnProperty")), [
              node.left.object,
              propertyName,
            ]),
          ),
          // Property exists and is configurable
          t.logicalExpression(
            "&&",
            t.callExpression(t.memberExpression(t.identifier("Object"), t.identifier("getOwnPropertyDescriptor")), [
              node.left.object,
              propertyName,
            ]),
            t.memberExpression(
              t.callExpression(t.memberExpression(t.identifier("Object"), t.identifier("getOwnPropertyDescriptor")), [
                node.left.object,
                propertyName,
              ]),
              t.identifier("configurable"),
            ),
          ),
        ),
        // Safe assignment
        node.right,
        // Skip assignment and warn
        t.sequenceExpression([
          t.callExpression(t.memberExpression(t.identifier("console"), t.identifier("warn")), [
            t.stringLiteral("[Hermes] Cannot assign to non-configurable property:"),
            propertyName,
          ]),
          node.left, // Return the existing value
        ]),
      );

      // Replace the assignment with our safe version
      path.get("right").replaceWith(configurabilityCheck);
    },
  };
};
