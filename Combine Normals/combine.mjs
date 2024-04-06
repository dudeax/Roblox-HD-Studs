import * as THREE from 'three';
import Jimp from "jimp";

const GEOMETRY_NORMAL_FILE = "studs.png";    // The primary geometry normal to use
const MATERIAL_NORMAL_FILE = "material.png"; // The material normal file that gets mixed into the geometry normal
const OUTPUT_FILE = "combined.png";          // Where to save the resulting normal file
const MIX_FACTOR = 0.5;                      // How much of the matieral file normals to mix in
const TEXTURE_SIZE_WIDTH = 1024;
const TEXTURE_SIZE_HEIGHT = 1024;

const UP_VECTOR = new THREE.Vector3(0, 1, 0);

function getImageData(image) {
    let vectors = [];

    for (let x = 0; x < image.getWidth(); x++) {
        for (let y = 0; y < image.getHeight(); y++) {
            const colorValues = Jimp.intToRGBA(image.getPixelColor(x, y));

            let vector = new THREE.Vector3(colorValues.r, colorValues.g, colorValues.b);

            vector.multiplyScalar(2.0 / 255.0);
            vector.addScalar(-1.0);
            vector.normalize()

            vectors.push(vector);
        }
    }
    
    return vectors;
}

function getImageFromData(data, sizeX, sizeY) {
    let image = new Jimp(sizeX, sizeY);

    for (let x = 0; x < sizeX; x++) {
        for (let y = 0; y < sizeY; y++) {
            let index = x * sizeY + y;
            let vector = data[index].clone();

            vector.addScalar(1.0);
            vector.multiplyScalar(255.0 / 2.0);
            vector.round();

            image.setPixelColor(Jimp.rgbaToInt(vector.x, vector.y, vector.z, 255), x, y);
        }
    }

    return image;
}

function getNormalWithStrength(normal, multiplier) {
    const theta = Math.atan2(normal.x, normal.y);
    const phi = Math.acos(normal.z) * multiplier;

    const phySin = Math.sin(phi);

    return new THREE.Vector3(
        Math.sin(theta) * phySin,
        Math.cos(theta) * phySin,
        Math.cos(phi)
    );
}

function combineNormals(primary, secondary, multiplier) {
    if (primary.length != secondary.length) {
        throw new Error("Normal maps must be the same size to combine!");
    }

    let combined = [];
    for (let i = 0; i < primary.length; i++) {
        let vector = getNormalWithStrength(secondary[i], multiplier);

        let invertedPrimary = primary[i].clone().negate();
        let basis = new THREE.Matrix4().lookAt(new THREE.Vector3(), invertedPrimary, UP_VECTOR);
        
        vector.applyMatrix4(basis);

        combined.push(vector);
    }
    return combined;
}

let geometryVectors = await Jimp.read(GEOMETRY_NORMAL_FILE).then((image) => {
        return getImageData(image);
    });

let materialVectors = await Jimp.read(MATERIAL_NORMAL_FILE).then((image) => {
        return getImageData(image);
    });

let finalVectors = combineNormals(geometryVectors, materialVectors, MIX_FACTOR);

let output = getImageFromData(finalVectors, TEXTURE_SIZE_WIDTH, TEXTURE_SIZE_HEIGHT);
output.write(OUTPUT_FILE);