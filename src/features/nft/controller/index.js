module.exports.getNftControllerInstance = (config) => new Controller(config)

const InvalidException = require('../../../errors/InvalidException')
const { makeRequest } = require('../../../services')
const { Protocol } = require('../../../services/blockchain/constants')
const Interface = require('./interface')
const { getTransactionControllerInstance } = require('../../transaction/controller')
const { ERC721_SAFE_TRANSFER_METHOD_ABI, ERC1155_SAFE_TRANSFER_METHOD_ABI, ERC721_MINT_METHOD_ABI } = require('../../../services/blockchain/contract/abis')
const { validateEvmTokenTransfer, validateEvmTokenMint } = require('../../../services/validations/evm')
const { getContractControllerInstance } = require('../../contract/controller')
const { ERC721_INTERFACE_ID } = require('../../../services/blockchain/contract/constants')
const { TransactionType } = require('../../transaction/entity')

class Controller extends Interface {
  /**
   * Get token info
   * @param {import('../entity').NftInfoInput} input
   * @returns {Promise<import('../entity').NftInfo>}
   */
  async getInfo(input) {
    const { protocol, tokenUid, tokenAddress } = input
    switch (protocol) {
      case Protocol.HATHOR:
        return makeRequest({ method: 'get', url: `/nft/${tokenUid}/info?protocol=${protocol}`, config: this.config })
      case Protocol.ETHEREUM:
      case Protocol.CELO:
      case Protocol.BSC:
      case Protocol.POLYGON:
      case Protocol.AVAXCCHAIN:
      case Protocol.SOLANA:
        return makeRequest({ method: 'get', url: `/nft/${tokenAddress}/info?protocol=${protocol}`, config: this.config })
      default:
        throw new InvalidException('Unsupported protocol')
    }
  }
  /**
   * Get token balance
   * @param {import('../entity').NftBalanceInfoInput} input
   * @returns {Promise<import('../entity').NftBalanceInfo>}
   */
  async getBalance(input) {
    const { protocol, tokenUid, tokenAddress, tokenId, address } = input
    switch (protocol) {
      case Protocol.HATHOR:
        return makeRequest({ method: 'get', url: `/nft/${tokenUid}/balance/${address}?protocol=${protocol}`, config: this.config })
      case Protocol.ETHEREUM:
      case Protocol.CELO:
      case Protocol.BSC:
      case Protocol.POLYGON:
      case Protocol.AVAXCCHAIN:
      case Protocol.SOLANA:
        return makeRequest({
          method: 'get',
          url: `/nft/${tokenAddress}/balance/${address}?protocol=${protocol}&${tokenId ? `tokenId=${tokenId}` : ''}`, config: this.config
        })
      default:
        throw new InvalidException('Unsupported protocol')
    }
  }
  /**
   * Get metadata of nft
   * @param {import('../entity').NftMetadataInput} input
   * @returns {Promise<import('../entity').NftMetadata>}
   */
  async getMetadata(input) {
    const { protocol, tokenUid, tokenAddress, tokenId } = input
    switch (protocol) {
      case Protocol.HATHOR:
        return makeRequest({ method: 'get', url: `/nft/${tokenUid}/metadata?protocol=${protocol}`, config: this.config })
      case Protocol.ETHEREUM:
      case Protocol.CELO:
      case Protocol.BSC:
      case Protocol.POLYGON:
      case Protocol.AVAXCCHAIN:
      case Protocol.SOLANA:
        return makeRequest({
          method: 'get',
          url: `/nft/${tokenAddress}/metadata?protocol=${protocol}&tokenId=${tokenId}`, config: this.config
        })
      default:
        throw new InvalidException('Unsupported protocol')
    }
  }
  /**
   * Create tokens
   * @param {import('../entity').NftCreationInput} input
   * @returns {Promise<import('../../transaction/entity').TransactionResponse>}
   */
   async create(input) {
    const { protocol, wallet, symbol, name, amount, uri, options } = input
    const tc = getTransactionControllerInstance(this.config)
    let tx;
    switch (protocol) {
      case Protocol.HATHOR:
        tx = await tc.createHathorTokenTransactionFromWallet({
          wallet,
          type: TransactionType.HATHOR_TOKEN_CREATION,
          tokenSymbol: symbol,
          tokenName: name,
          amount,
          nftData: uri,
          mintAuthorityAddress: options && options.mintAuthorityAddress,
          meltAuthorityAddress: options && options.meltAuthorityAddress,
        })
        break
      case Protocol.SOLANA:
        tx = await tc.createSolanaNFT({
          wallet,
          maxSupply: Number(amount),
          uri
        })
        break
      default:
        throw new InvalidException('Unsupported protocol')
    }
    return await tc.sendTransaction(tx)
  }
  /**
   * Transfer NFT
   * @param {import('../entity').NftTransferInput} input
   * @returns {Promise<import('../../transaction/entity').TransactionResponse>}
   */
  async transfer(input) {
    const { protocol, token, wallet, destination, tokenId, amount, destinations } = input
    const tc = getTransactionControllerInstance(this.config)
    let tx;
    switch (protocol) {
      case Protocol.HATHOR:
        tx = await tc.createHathorTransferTransactionFromWallet({
          wallet,
          outputs: destination ? [{
            address: destination, amount, token
          }] : destinations
        })
        break
      case Protocol.SOLANA:
        tx = await tc.createSolanaTransferTransaction({ wallet, destination, token, amount, isNFT: true })
        break
      case Protocol.ETHEREUM:
      case Protocol.CELO:
      case Protocol.BSC:
      case Protocol.POLYGON:
      case Protocol.AVAXCCHAIN: {
        validateEvmTokenTransfer(input)
        const cc = getContractControllerInstance(this.config)
        let params, contractAbi
        if (await cc.supportsInterfaceId({ protocol, contractAddress: token, interfaceId: ERC721_INTERFACE_ID })) {
          params = [wallet.address, destination, tokenId]
          contractAbi = ERC721_SAFE_TRANSFER_METHOD_ABI
        } else {
          if (!amount || isNaN(amount) || Number(amount) < 0) {
            throw new InvalidException('Invalid amount')
          }
          params = [wallet.address, destination, tokenId, amount, []]
          contractAbi = ERC1155_SAFE_TRANSFER_METHOD_ABI
        }
        return await cc.callMethodTransaction({
          wallet,
          protocol,
          contractAddress: token,
          method: 'safeTransferFrom',
          contractAbi,
          params
        })
      }
      default:
        throw new InvalidException('Unsupported protocol')
    }
    return await tc.sendTransaction(tx)
  }
  /**
   * Mint NFTs
   * @param {import('../entity').NftMintInput} input
   * @returns {Promise<import('../../transaction/entity').TransactionResponse>}
   */
  async mint(input) {
    const { protocol, token, wallet, destination, amount, options } = input
    const tc = getTransactionControllerInstance(this.config)
    let tx;
    switch (protocol) {
      case Protocol.HATHOR:
        tx = await tc.createHathorTokenTransactionFromWallet({
          type: TransactionType.HATHOR_TOKEN_MINT,
          wallet,
          tokenUid: token,
          amount,
          address: destination,
          changeAddress: options && options.changeAddress,
          mintAuthorityAddress: options && options.mintAuthorityAddress,
        })
        break
      case Protocol.SOLANA:
        tx = await tc.createSolanaTokenMintTransaction({ wallet, destination, token, amount })
        break
      case Protocol.ETHEREUM:
      case Protocol.CELO:
      case Protocol.BSC:
      case Protocol.POLYGON:
      case Protocol.AVAXCCHAIN: {
        validateEvmTokenMint(input)
        const cc = getContractControllerInstance(this.config)
        let params, contractAbi, _options = options || {}
        _options.tokenId = _options.tokenId || Math.round(Math.random() * Number.MAX_SAFE_INTEGER)
        _options.uri = _options.uri || ''
        if (await cc.supportsInterfaceId({ protocol, contractAddress: token, interfaceId: ERC721_INTERFACE_ID })) {
          params = [destination, _options.tokenId, _options.uri]
          contractAbi = ERC721_MINT_METHOD_ABI
        } else {
          if (!amount || isNaN(amount) || Number(amount) < 0) {
            throw new InvalidException('Invalid amount')
          }
          params = [destination, _options.tokenId, amount, _options.uri, []]
          contractAbi = ERC1155_SAFE_TRANSFER_METHOD_ABI
        }
        return await getContractControllerInstance(this.config).callMethodTransaction({
          wallet,
          protocol,
          contractAddress: token,
          method: 'mint',
          contractAbi,
          params,
          feeCurrency: options && options.feeCurrency
        })
      }
      default:
        throw new InvalidException('Unsupported protocol')
    }
    return await tc.sendTransaction(tx)
  }
  /**
   * Burn NFTs
   * @param {import('../entity').NftBurnInput} input
   * @returns {Promise<import('../../transaction/entity').TransactionResponse>}
   */
  async burn(input) { }
}

module.exports.NftController = Controller
