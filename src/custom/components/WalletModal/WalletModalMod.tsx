import { Trans } from '@lingui/macro'
import { AbstractConnector } from '@web3-react/abstract-connector'
import { UnsupportedChainIdError, useWeb3React } from '@web3-react/core'
import { WalletConnectConnector } from '@web3-react/walletconnect-connector'
import { AutoRow } from 'components/Row'
// import { useWalletConnectMonitoringEventCallback } from 'hooks/useMonitoringEventCallback'
import { useEffect, useState } from 'react'
import ReactGA from 'react-ga'
import styled from 'styled-components/macro'

import MetamaskIcon from 'assets/images/metamask.png'
import TallyIcon from 'assets/external/tally.svg'
import { ReactComponent as Close } from 'assets/images/x.svg'
import { injected, portis } from 'connectors'
// import { OVERLAY_READY } from 'connectors/Fortmatic'
import { SUPPORTED_WALLETS } from 'constants/index'
import usePrevious from 'hooks/usePrevious'
import { useModalOpen, useWalletModalToggle } from 'state/application/hooks'
import { ApplicationModal } from 'state/application/reducer'
import {
  // ExternalLink,
  TYPE,
} from 'theme'
import { isMobile } from 'react-device-detect'
// import AccountDetails from 'components/AccountDetails'
import ModalMod from '@src/components/Modal'
import Option from 'components/WalletModal/Option'
import PendingView from 'components/WalletModal/PendingView'
import { LightCard } from 'components/Card'

export const CloseIcon = styled.div`
  position: absolute;
  right: 1rem;
  top: 14px;
  &:hover {
    cursor: pointer;
    opacity: 0.6;
  }
`

const CloseColor = styled(Close)`
  path {
    stroke: ${({ theme }) => theme.text4};
  }
`

const Wrapper = styled.div`
  ${({ theme }) => theme.flexColumnNoWrap}
  margin: 0;
  padding: 0;
  width: 100%;
  overflow-y: auto; /* MOD */
`

export const HeaderRow = styled.div`
  ${({ theme }) => theme.flexRowNoWrap};
  padding: 1rem 1rem;
  font-weight: 500;
  color: ${(props) => (props.color === 'blue' ? ({ theme }) => theme.primary1 : 'inherit')};
  ${({ theme }) => theme.mediaWidth.upToMedium`
    padding: 1rem;
  `};
`

export const ContentWrapper = styled.div`
  /* background-color: ${({ theme }) => theme.bg0}; */
  background-color: ${({ theme }) => theme.bg1};
  padding: 0 1rem 1rem 1rem;
  border-bottom-left-radius: 20px;
  border-bottom-right-radius: 20px;

  ${({ theme }) => theme.mediaWidth.upToMedium`padding: 0 1rem 1rem 1rem`};
`

const UpperSection = styled.div`
  position: relative;

  h5 {
    margin: 0;
    margin-bottom: 0.5rem;
    font-size: 1rem;
    font-weight: 400;
  }

  h5:last-child {
    margin-bottom: 0px;
  }

  h4 {
    margin-top: 0;
    font-weight: 500;
  }
`

const OptionGrid = styled.div`
  display: grid;
  grid-gap: 10px;
  ${({ theme }) => theme.mediaWidth.upToMedium`
    grid-template-columns: 1fr;
    grid-gap: 10px;
  `};
`

export const HoverText = styled.div`
  text-decoration: none;
  color: ${({ theme }) => theme.text1};
  display: flex;
  align-items: center;

  :hover {
    cursor: pointer;
  }
`

const WALLET_VIEWS = {
  OPTIONS: 'options',
  OPTIONS_SECONDARY: 'options_secondary',
  ACCOUNT: 'account',
  PENDING: 'pending',
}

// MOD
export interface WalletModalProps {
  pendingTransactions: string[] // hashes of pending
  confirmedTransactions: string[] // hashes of confirmed
  ENSName?: string
  Modal: typeof ModalMod
  NewToEthereum: () => JSX.Element
  CustomTerms: () => JSX.Element
}

export default function WalletModal({
  // pendingTransactions,
  // confirmedTransactions,
  // ENSName,
  Modal,
  NewToEthereum,
  CustomTerms,
}: WalletModalProps) {
  /* {
    pendingTransactions: string[] // hashes of pending
    confirmedTransactions: string[] // hashes of confirmed
    ENSName?: string
  } */
  // important that these are destructed from the account-specific web3-react context
  const { active, account, connector, activate, error } = useWeb3React()

  const [walletView, setWalletView] = useState(WALLET_VIEWS.ACCOUNT)

  const [pendingWallet, setPendingWallet] = useState<AbstractConnector | undefined>()

  const [pendingError, setPendingError] = useState<boolean>()

  const walletModalOpen = useModalOpen(ApplicationModal.WALLET)
  const toggleWalletModal = useWalletModalToggle()

  const previousAccount = usePrevious(account)

  // const logMonitoringEvent = useWalletConnectMonitoringEventCallback()

  // close on connection, when logged out before
  useEffect(() => {
    if (account && !previousAccount && walletModalOpen) {
      toggleWalletModal()
    }
  }, [account, previousAccount, toggleWalletModal, walletModalOpen])

  // always reset to account view
  useEffect(() => {
    if (walletModalOpen) {
      setPendingError(false)
      setWalletView(WALLET_VIEWS.ACCOUNT)
    }
  }, [walletModalOpen])

  // close modal when a connection is successful
  const activePrevious = usePrevious(active)
  const connectorPrevious = usePrevious(connector)
  useEffect(() => {
    if (walletModalOpen && ((active && !activePrevious) || (connector && connector !== connectorPrevious && !error))) {
      setWalletView(WALLET_VIEWS.ACCOUNT)
      toggleWalletModal() // mod
    }
  }, [
    setWalletView,
    active,
    error,
    connector,
    walletModalOpen,
    activePrevious,
    connectorPrevious,
    toggleWalletModal, // mod
  ])

  const tryActivation = async (connector: AbstractConnector | undefined) => {
    let name = ''
    Object.keys(SUPPORTED_WALLETS).map((key) => {
      if (connector === SUPPORTED_WALLETS[key].connector) {
        return (name = SUPPORTED_WALLETS[key].name)
      }
      return true
    })
    // log selected wallet
    ReactGA.event({
      category: 'Wallet',
      action: 'Change Wallet',
      label: name,
    })
    setPendingWallet(connector) // set wallet for pending view
    setWalletView(WALLET_VIEWS.PENDING)

    // if the connector is walletconnect and the user has already tried to connect, manually reset the connector
    if (connector instanceof WalletConnectConnector && connector.walletConnectProvider?.wc?.uri) {
      connector.walletConnectProvider = undefined
    }

    connector &&
      activate(connector, undefined, true)
        // .then(async () => {
        //   const walletAddress = await connector.getAccount()
        //   logMonitoringEvent({ walletAddress })
        // })
        .catch((error) => {
          if (error instanceof UnsupportedChainIdError) {
            activate(connector) // a little janky...can't use setError because the connector isn't set
          } else {
            setPendingError(true)
          }
        })
  }

  // close wallet modal if fortmatic modal is active
  // useEffect(() => {
  //   fortmatic.on(OVERLAY_READY, () => {
  //     toggleWalletModal()
  //   })
  // }, [toggleWalletModal])

  // get wallets user can switch too, depending on device/browser
  function getOptions() {
    const isMetamask = window.ethereum && window.ethereum.isMetaMask
    const isTally = window.ethereum && window.ethereum.isTally
    const tallyInstalled = window.tally && window.tally.isTally
    const tallyIsDefault = isTally && tallyInstalled
    return Object.keys(SUPPORTED_WALLETS).map((key) => {
      const option = SUPPORTED_WALLETS[key]
      // check for mobile options
      if (isMobile) {
        //disable portis on mobile for now
        if (option.connector === portis) {
          return null
        }

        if (!window.web3 && !window.ethereum && option.mobile) {
          return (
            <Option
              onClick={() => {
                option.connector !== connector && !option.href && tryActivation(option.connector)
              }}
              id={`connect-${key}`}
              key={key}
              active={option.connector && option.connector === connector}
              color={option.color}
              link={option.href}
              header={option.name}
              subheader={null}
              icon={option.iconURL}
            />
          )
        }
        return null
      }

      // overwrite injected when needed
      if (option.connector === injected) {
        // don't show injected if there's no injected provider
        if (!(window.web3 || window.ethereum)) {
          if (option.name === 'MetaMask') {
            return (
              <Option
                id={`connect-${key}`}
                key={key}
                color={'#E8831D'}
                header={<Trans>Install Metamask</Trans>}
                subheader={null}
                link={'https://metamask.io/'}
                icon={MetamaskIcon}
              />
            )
          } else if (option.name === 'Tally Ho' && tallyInstalled && !tallyIsDefault) {
            return (
              <Option
                id={`connect-${key}`}
                key={key}
                color={'#D59B4B'}
                header={<Trans>Tally Ho</Trans>}
                subheader={<Trans>To use Tally Ho, enable as default in Tally Ho settings and refresh the page.</Trans>}
                link={'https://tally.cash/'}
                icon={TallyIcon}
              />
            )
          } else {
            return null //dont want to return install twice
          }
        }
        // show Tally hint if installed but not set to default, to avoid confusion with MetaMask
        else if (option.name === 'Tally Ho' && tallyInstalled && !tallyIsDefault) {
          return (
            <Option
              id={`connect-${key}`}
              key={key}
              color={'#D59B4B'}
              header={<Trans>Tally Ho</Trans>}
              subheader={<Trans>To use Tally Ho, enable as default in Tally Ho settings and refresh the page.</Trans>}
              link={'https://tally.cash/'}
              icon={TallyIcon}
            />
          )
        }
        // don't return Tally if not installed
        else if (option.name === 'Tally Ho' && !tallyInstalled) {
          return null
        }
        // don't return metamask if injected provider isn't metamask
        else if (option.name === 'MetaMask' && !isMetamask) {
          return null
        }
        // likewise for generic
        else if (option.name === 'Injected' && (isMetamask || isTally)) {
          return null
        }
      }

      // return rest of options
      return (
        !isMobile &&
        !option.mobileOnly && (
          <Option
            id={`connect-${key}`}
            onClick={() => {
              option.connector === connector
                ? setWalletView(WALLET_VIEWS.ACCOUNT)
                : !option.href && tryActivation(option.connector)
            }}
            key={key}
            active={option.connector === connector}
            color={option.color}
            link={option.href}
            header={option.name}
            subheader={null} //use option.descriptio to bring back multi-line
            icon={option.iconURL}
          />
        )
      )
    })
  }

  function getModalContent() {
    if (error) {
      return (
        <UpperSection>
          <CloseIcon onClick={toggleWalletModal}>
            <CloseColor />
          </CloseIcon>
          <HeaderRow>
            {error instanceof UnsupportedChainIdError ? <Trans>Wrong Network</Trans> : <Trans>Error connecting</Trans>}
          </HeaderRow>
          <ContentWrapper>
            {error instanceof UnsupportedChainIdError ? (
              <h5>
                <Trans>Please connect to the appropriate network.</Trans>
              </h5>
            ) : (
              <Trans>Error connecting. Try refreshing the page.</Trans>
            )}
          </ContentWrapper>
        </UpperSection>
      )
    }
    // if (account && walletView === WALLET_VIEWS.ACCOUNT) {
    //   return (
    //     <AccountDetails
    //       toggleWalletModal={toggleWalletModal}
    //       pendingTransactions={pendingTransactions}
    //       confirmedTransactions={confirmedTransactions}
    //       ENSName={ENSName}
    //       openOptions={() => setWalletView(WALLET_VIEWS.OPTIONS)}
    //     />
    //   )
    // }
    return (
      <UpperSection>
        <CloseIcon onClick={toggleWalletModal}>
          <CloseColor />
        </CloseIcon>
        {walletView !== WALLET_VIEWS.ACCOUNT ? (
          <HeaderRow color="blue">
            <HoverText
              onClick={() => {
                setPendingError(false)
                setWalletView(WALLET_VIEWS.ACCOUNT)
              }}
            >
              <Trans>Back</Trans>
            </HoverText>
          </HeaderRow>
        ) : (
          <HeaderRow>
            <HoverText>
              <Trans>Connect to a wallet</Trans>
            </HoverText>
          </HeaderRow>
        )}

        <ContentWrapper>
          <LightCard style={{ marginBottom: '16px' }}>
            <AutoRow style={{ flexWrap: 'nowrap' }}>
              <TYPE.main fontSize={14}>
                {/* <Trans>
                  By connecting a wallet, you agree to Uniswap Labs’{' '}
                  <ExternalLink href="https://uniswap.org/terms-of-service/">Terms of Service</ExternalLink> and
                  acknowledge that you have read and understand the{' '}
                  <ExternalLink href="https://uniswap.org/disclaimer/">Uniswap protocol disclaimer</ExternalLink>.
                </Trans> */}
                <CustomTerms />
              </TYPE.main>
            </AutoRow>
          </LightCard>

          {walletView === WALLET_VIEWS.PENDING ? (
            <PendingView
              connector={pendingWallet}
              error={pendingError}
              setPendingError={setPendingError}
              tryActivation={tryActivation}
            />
          ) : (
            <OptionGrid>{getOptions()}</OptionGrid>
          )}
          {walletView !== WALLET_VIEWS.PENDING && <NewToEthereum />}
        </ContentWrapper>
      </UpperSection>
    )
  }

  return (
    <Modal isOpen={walletModalOpen} onDismiss={toggleWalletModal} minHeight={false} maxHeight={90}>
      <Wrapper>{getModalContent()}</Wrapper>
    </Modal>
  )
}
