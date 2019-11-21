const fs = require('fs');
const path = require('path');
const memoize = require('lodash/memoize');
const { sync: resolve } = require('resolve');

const getDirs = (config) => {
  const { alloyConfig, dir } = config;

  const platformDirName = alloyConfig.platform === 'ios' ? 'iphone' : alloyConfig.platform;
  const resourcesPlatform = path.join(dir.resources, platformDirName);
  const resourcesPlatformAlloy = path.join(resourcesPlatform, 'alloy');

  return {
    ...dir,
    resourcesPlatform,
    resourcesPlatformAlloy,
  };
};

const getRelativePathIfInDir = (filename, dir) => {
  const relative = path.relative(dir, filename);
  if (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) {
    return relative;
  }

  return null;
};

const compiledToSrcFilename = memoize((filename, dirs) => {
  const { home, resourcesPlatformAlloy } = dirs;
  const platformAlloyRelativePath = getRelativePathIfInDir(filename, resourcesPlatformAlloy);
  if (!platformAlloyRelativePath) {
    return null;
  }

  const appFilename = path.join(home, platformAlloyRelativePath);

  return fs.existsSync(appFilename) ? appFilename : null;
});

const transformRequiredToTIRequiredFilename = memoize((requiredPath, dirs) => {
  const { home, lib } = dirs;
  const homeRelativePath = getRelativePathIfInDir(requiredPath, home);
  if (!homeRelativePath) {
    return null;
  }

  const libRelative = getRelativePathIfInDir(requiredPath, lib);
  return (libRelative ? `/${libRelative}` : `/alloy/${homeRelativePath}`).replace(/\.[^.]+$/, '');
});

const transformRelativeRequiredPathToTIRequiredPath = (requiredPath, state) => {
  // if it's not a relative path, let Titanium resolve the module
  if (!/^[.]{1,2}\//.test(requiredPath)) {
    return requiredPath;
  }

  const { opts, file } = state;
  const { config, logger } = opts;
  const dirs = getDirs(config);

  const compiledFilename = file.opts.filename || file.ast.loc.filename;
  const filename = compiledToSrcFilename(compiledFilename, dirs);
  // if unable to detect src filename, let Titanium resolve the module
  if (!filename) {
    return requiredPath;
  }

  try {
    const requiredAbsPath = resolve(requiredPath, { basedir: path.dirname(filename) });
    const transformed = transformRequiredToTIRequiredFilename(requiredAbsPath, dirs);
    logger.debug(`[ti-alloy-rewrite-imports]: rewrote ${requiredPath} to ${transformed} from ${filename}`);
    return transformed;
  } catch (e) {
    logger.warn(`unable to resolve '${requiredPath}' from ${filename}`);
  }

  return requiredPath;
};

module.exports = {
  transformRelativeRequiredPathToTIRequiredPath,
};
