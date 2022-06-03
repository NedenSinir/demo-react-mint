
import { clusterApiUrl } from '@solana/web3.js';
import React, { FC, ReactNode, useMemo,useState,useEffect } from 'react';
import "./App.css";
import { web3, utils, Program, AnchorProvider } from "@project-serum/anchor"
import { SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, useAnchorWallet, WalletProvider, useConnection } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import {
    GlowWalletAdapter,
    PhantomWalletAdapter,
    SlopeWalletAdapter,
    SolflareWalletAdapter,
    TorusWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import idl from "./idl.json"
require('./App.css');
require('@solana/wallet-adapter-react-ui/styles.css');

const App: FC = () => {
    
    const [data, setData] = useState("a")
    useEffect(() => {
        fetch("https://murmuring-peak-29089.herokuapp.com/api").then(
            response => response.json()
        ).then(
            data => {
                setData(data.message)
            }
        )
    }, [])

    return (
        <Context>
            <h1>{data}</h1>
            <Content />
            
        </Context>
    );
};
export default App;

const Context: FC<{ children: ReactNode }> = ({ children }) => {
    // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'.
    const network = WalletAdapterNetwork.Devnet;

    // You can also provide a custom RPC endpoint.
    const endpoint = useMemo(() => clusterApiUrl(network), [network]);

    // @solana/wallet-adapter-wallets includes all the adapters but supports tree shaking and lazy loading --
    // Only the wallets you configure here will be compiled into your application, and only the dependencies
    // of wallets that your users connect to will be loaded.
    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            new GlowWalletAdapter(),
            new SlopeWalletAdapter(),
            new SolflareWalletAdapter({ network }),
            new TorusWalletAdapter(),
        ],
        [network]
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>{children}</WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};

const Content: FC = () => {


    const wallet = useAnchorWallet();
    const { connection } = useConnection();
    const programID = new web3.PublicKey(idl.metadata.address);
    let hasPerm=false;
    let mintAddress="";

    
    const sendWallet = async () => {
        try {

            const requestOptions = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ wallet: wallet?.publicKey }),

            };
           let data = await fetch('https://murmuring-peak-29089.herokuapp.com/data', requestOptions).then((res) => res.json()).then((data) => data)
           hasPerm = data.hasPermission;
           mintAddress = data.pickedNft
           console.log(hasPerm,"---",mintAddress)
            if (hasPerm && mintAddress) {
                mintOne(mintAddress)
            }
        } catch (err) {
            console.log(err)
        }
    }

    const mintOne = async (pickedNft: string) => {
        console.log(pickedNft, "<--------<")
        if (!wallet) return
        const provider = new AnchorProvider(
            connection, wallet, AnchorProvider.defaultOptions(),
        );
        // @ts-ignore
        const program = new Program(idl, programID, provider);
        let currentMintAccPk = new web3.PublicKey(pickedNft);


        const associatedTokenPk = await getAssociatedTokenAddress(currentMintAccPk, wallet.publicKey);

        let [escrowAccount, escrowAccountBump] =
            await web3.PublicKey.findProgramAddress(
                [currentMintAccPk.toBuffer(), utils.bytes.utf8.encode("secret_seed")],
                programID
            );

        console.log(associatedTokenPk.toBase58())

        console.log(escrowAccount, "<-- escrow account")
        try {
            const tx = new web3.Transaction().add(
                await program.methods.sellNft(escrowAccountBump).accounts({
                    minter: provider.wallet.publicKey,
                    minterTokenAcc: associatedTokenPk,
                    nftMint: currentMintAccPk,
                    nftHolderTokenAcc: escrowAccount,
                    systemProgram: web3.SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                    rent: web3.SYSVAR_RENT_PUBKEY,
                }).instruction()
            )

            tx.add(
                await SystemProgram.transfer({
                    fromPubkey: wallet.publicKey,
                    toPubkey: new web3.PublicKey("6mHL2LPQQYrcVTk89NzhMH2oTLzomo6LPN7T69ARZUw6"),
                    lamports: 1000000000,
                })
            );

            await provider.sendAndConfirm(tx)

            try {
                console.log("entered new area")
                const requestOptions = {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ wallet: wallet?.publicKey , pickedNft:pickedNft}),
    
                };
               let _data = await fetch('https://murmuring-peak-29089.herokuapp.com/confrim', requestOptions).then((res) => res.json()).then((data) => console.log(data))
            } catch (err) {
                console.log(err)
            }
            

        } catch (error) {
            console.log(error)
        }

    }
    return (
        <div className="App">
            <WalletMultiButton />
            <button onClick={sendWallet}>MintOne</button>

        </div>
    );
};
