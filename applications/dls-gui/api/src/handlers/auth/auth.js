/**
 * INTEL CONFIDENTIAL
 * Copyright (c) 2018 Intel Corporation
 *
 * The source code contained or described herein and all documents related to
 * the source code ("Material") are owned by Intel Corporation or its suppliers
 * or licensors. Title to the Material remains with Intel Corporation or its
 * suppliers and licensors. The Material contains trade secrets and proprietary
 * and confidential information of Intel or its suppliers and licensors. The
 * Material is protected by worldwide copyright and trade secret laws and treaty
 * provisions. No part of the Material may be used, copied, reproduced, modified,
 * published, uploaded, posted, transmitted, distributed, or disclosed in any way
 * without Intel's prior express written permission.
 *
 * No license under any patent, copyright, trade secret or other intellectual
 * property right is granted to or conferred upon you by disclosure or delivery
 * of the Materials, either expressly, by implication, inducement, estoppel or
 * otherwise. Any license under such intellectual property rights must be express
 * and approved by Intel in writing.
 */

const logger = require('../../utils/logger');
const errHandler = require('../../utils/error-handler');
const errMessages = require('../../utils/error-messages');
const jwt = require('jsonwebtoken');
const Q = require('q');
const HttpStatus = require('http-status-codes');

const K8S_TOKEN_USER_KEY = 'kubernetes.io/serviceaccount/namespace';

const decodeToken = function (token) {
  return Q.Promise(function (resolve, reject) {
    const decoded = jwt.decode(token);
    if (decoded && decoded[K8S_TOKEN_USER_KEY]) {
      logger.debug('Provided token is valid');
      resolve(decoded);
    } else {
      logger.debug('Provided token is invalid');
      reject(errHandler(HttpStatus.UNAUTHORIZED, errMessages.AUTH.INVALID_TOKEN));
    }
  });
};

const getUserAuthority = function (req, res) {
  if (!req.body.token) {
    logger.debug('Missing token in request body');
    res.status(HttpStatus.BAD_REQUEST).send({message: errMessages.AUTH.MISSING_TOKEN});
    return;
  }
  decodeToken(req.body.token)
    .then(function (decoded) {
      logger.info('Token decoded. Data sent to user');
      res.send({decoded: {username: decoded[K8S_TOKEN_USER_KEY]}});
    })
    .catch(function (err) {
      logger.debug('Cannot decode provided token');
      res.status(err.status).send({message: err.message});
    });
};

module.exports = {
  getUserAuthority: getUserAuthority,
  decodeToken: decodeToken
};