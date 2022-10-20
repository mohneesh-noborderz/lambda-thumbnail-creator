const fs = require("fs");

module.exports = (filePath) => {
    if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        // console.log({ stats });
        const fileSizeInBytes = stats.size;
        console.log({ fileSizeInBytes });

        if (fileSizeInBytes > 0) {
            return true;
        } else {
            console.error(`${filePath} exists but is 0 bytes in size`);
            return false;
        }
    } else {
        console.error(`${filePath} does not exist`);
        return false;
    }
};
