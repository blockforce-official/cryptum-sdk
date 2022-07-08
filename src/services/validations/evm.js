const InvalidException = require("../../errors/InvalidException")
const { Protocol } = require("../blockchain/constants")

module.exports.validateEvmTokenTransfer = ({
  wallet,
  token,
  destination,
  tokenId,
  amount,
  protocol,
}) => {
  if (!wallet) {
    throw new InvalidException('Invalid wallet')
  }
  if (!token || typeof token !== 'string') {
    throw new InvalidException('Invalid token address')
  }
  if (!destination || typeof destination !== 'string') {
    throw new InvalidException('Invalid destination address')
  }
  if (isNaN(tokenId)) {
    throw new InvalidException('Invalid token id')
  }
  if (amount && Number(amount) < 0) {
    throw new InvalidException('Invalid amount')
  }
  if (![Protocol.BSC, Protocol.CELO, Protocol.ETHEREUM, Protocol.AVAXCCHAIN, Protocol.POLYGON].includes(protocol)) {
    throw new InvalidException('Invalid protocol')
  }
}
module.exports.validateEvmTokenMint = ({
  wallet,
  token,
  destination,
  amount,
  protocol,
  options
}) => {
  if (!wallet) {
    throw new InvalidException('Invalid wallet')
  }
  if (!token || typeof token !== 'string') {
    throw new InvalidException('Invalid token address')
  }
  if (!destination || typeof destination !== 'string') {
    throw new InvalidException('Invalid destination address')
  }
  if (!amount || isNaN(amount) || Number(amount) < 0) {
    throw new InvalidException('Invalid amount')
  }
  if (![Protocol.BSC, Protocol.CELO, Protocol.ETHEREUM, Protocol.AVAXCCHAIN, Protocol.POLYGON].includes(protocol)) {
    throw new InvalidException('Invalid protocol')
  }
  if (options) {
    if (options.feeCurrency && typeof options.feeCurrency !== 'string') {
      throw new InvalidException('Invalid feeCurrency')
    }
    if (options.mintAuthorityAddress && typeof options.mintAuthorityAddress !== 'string') {
      throw new InvalidException('Invalid mintAuthorityAddress')
    }
    if (options.meltAuthorityAddress && typeof options.meltAuthorityAddress !== 'string') {
      throw new InvalidException('Invalid meltAuthorityAddress')
    }
  }
}