function trimPath(path){
    return path.replace(/^\/+|\/+$/g, '');
}

module.exports = {
    trimPath
};