'use strict';

const btHci = require('h5.bluetooth.hci');
const EirDataType = btHci.EirDataType;

/**
 * @enum {number}
 */
const DeviceModel = exports.DeviceModel = {
  Nav: 0x89,
};

/**
 * @param {Object<EirDataType, function(Buffer, INodeDeviceMsd)>} eirDataTypeDecoders
 */
exports.registerManufacturerSpecificDataDecoder = function(eirDataTypeDecoders)
{
  const originalDecoder = eirDataTypeDecoders[EirDataType.ManufacturerSpecificData];

  eirDataTypeDecoders[EirDataType.ManufacturerSpecificData] = function(buffer, msd)
  {
    const deviceModel = buffer[1];
    const deviceModelDecoder = exports.msdDecoders[deviceModel];

    if (deviceModelDecoder)
    {
      deviceModelDecoder(buffer, msd);
    }
    else if (originalDecoder)
    {
      originalDecoder(buffer, msd);
    }
  };
};

/**
 * @param {Buffer} buffer
 * @param {Object} [msd]
 * @returns {INodeDeviceMsd}
 * @throws {Error} If the specified buffer is not a valid iNode device MSD buffer.
 */
exports.decodeMsd = function(buffer, msd)
{
  const deviceModel = buffer[1];
  const deviceModelDecoder = exports.msdDecoders[deviceModel];

  if (!deviceModelDecoder)
  {
    throw new Error(`Cannot decode iNode MSD: '${deviceModel}' is not a valid device model!`);
  }

  if (!msd)
  {
    msd = {
      type: EirDataType.ManufacturerSpecificData,
      typeLabel: EirDataType[EirDataType.ManufacturerSpecificData],
      companyIdentifier: buffer.readUInt16LE(0)
    };
  }

  deviceModelDecoder(buffer, msd);

  return msd;
};

/**
 * @type {Object<DeviceModel, function(Buffer, EirDataStructure)>}
 */
exports.msdDecoders = {
  [DeviceModel.Nav]: function(buffer, msd)
  {
    msd.model = DeviceModel.Nav;
    msd.modelLabel = 'iNode Nav';

    decodeAccelerometer(buffer, msd);
    decodeMagneticField(buffer, msd);
    decodeRtto(buffer, 0, msd);
    decodeAlarms(buffer, 0, -1, msd);
  },
};

/**
 * @private
 * @param {Buffer} buffer
 * @param {INodeDeviceMsd} msd
 */
function decodeAccelerometer(buffer, msd) {
  msd.position = {
    x: buffer.readInt16LE(2) / 16000,
    y: buffer.readInt16LE(4) / 16000,
    z: buffer.readInt16LE(6) / 16000,
  };
}

/**
 * @private
 * @param {Buffer} buffer
 * @param {INodeDeviceMsd} msd
 */
function decodeMagneticField(buffer, msd) {
  msd.magneticField = {
    x: buffer.readInt16LE(8) / 10000,
    y: buffer.readInt16LE(10) / 10000,
    z: buffer.readInt16LE(12) / 10000
  };
}

/**
 * @private
 * @param {Buffer} buffer
 * @param {number} i
 * @param {INodeDeviceMsd} msd
 */
function decodeRtto(buffer, i, msd)
{
  msd.rtto = !!(buffer[i] & 0x02);
}

/**
 * @private
 * @param {Buffer} buffer
 * @param {number} batteryI
 * @param {number} extendedI
 * @param {INodeDeviceMsd} msd
 */
function decodeAlarms(buffer, batteryI, extendedI, msd)
{
  const battery = ((batteryI === -1 ? 0 : buffer[batteryI]) << 13) & 0x8000;
  const extended = extendedI === -1 ? 0 : buffer.readUInt16LE(extendedI);
  const alarms = extended | battery;

  msd.alarms = {
    lowBattery: !!(alarms & 0x8000)
  };

  if (extendedI !== -1)
  {
    Object.assign(msd.alarms, {
      moveAccelerometer: !!(alarms & 0x01),
      levelAccelerometer: !!(alarms & 0x02),
      levelTemperature: !!(alarms & 0x04),
      levelHumidity: !!(alarms & 0x08),
      contactChange: !!(alarms & 0x10),
      moveStopped: !!(alarms & 0x20),
      moveGTimer: !!(alarms & 0x40),
      levelAccelerometerChange: !!(alarms & 0x80),
      levelMagnetChange: !!(alarms & 0x100),
      levelMagnetTimer: !!(alarms & 0x200)
    });
  }
}

/**
 * @typedef {Object} INodeDeviceMsd
 * @property {DeviceModel} model
 * @property {string} modelLabel
 * @property {boolean} rtto
 * @property {boolean} alarms.lowBattery
 */

/**
 * @typedef {Object} INodeNav
 * @property {DeviceModel} model
 * @property {string} modelLabel
 * @property {boolean} rtto
 * @property {boolean} alarms.lowBattery
 * @property {boolean} alarms.moveAccelerometer
 * @property {boolean} alarms.levelAccelerometer
 * @property {boolean} alarms.levelTemperature
 * @property {boolean} alarms.levelHumidity
 * @property {boolean} alarms.contactChange
 * @property {boolean} alarms.moveStopped
 * @property {boolean} alarms.moveGTimer
 * @property {boolean} alarms.levelAccelerometerChange
 * @property {boolean} alarms.levelMagnetChange
 * @property {boolean} alarms.levelMagnetTimer
 * @property {Date} time
 * @property {number} groups
 * @property {number} batteryLevel
 * @property {number} batteryVoltage
 * @property {Buffer} signature
 * @property {boolean} [input]
 * @property {boolean} [output]
 * @property {Object} [position]
 * @property {number} position.x
 * @property {number} position.y
 * @property {number} position.z
 * @property {Object} [magneticField]
 * @property {number} magneticField.x
 * @property {number} magneticField.y
 * @property {number} magneticField.z
 * @property {number} [temperature]
 * @property {number} [humidity]
 * @property {number} [pressure]
 * @property {boolean} [magneticFieldDirection]
 * @property {number} [magneticField]
 */

