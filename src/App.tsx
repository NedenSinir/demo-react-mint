import { clusterApiUrl } from '@solana/web3.js';
import React, { FC, ReactNode, useMemo, useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'; import "./App.css";
import { web3, utils, Program, AnchorProvider } from "@project-serum/anchor"
import { SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { WalletAdapterNetwork, WalletSignTransactionError } from '@solana/wallet-adapter-base';
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
import 'react-toastify/dist/ReactToastify.css';
require('./App.css');
require('@solana/wallet-adapter-react-ui/styles.css');

const App: FC = () => {



    return (
        <Context>
            <Content />
        </Context>
    );
};
export default App;

const Time: FC = ()=>{

    let [ogMint, setOgMint] = useState(Number);
    let [wlMint, setWlMint] = useState(Number);
    let [normalMint, setNormalMint] = useState(Number);
    let [ogMintCount, setOgMintCount] = useState("");
    let [wlMintCount, setWlMintCount] = useState("");
    let [normalMintCount, setNormalMintCount] = useState("");
    useEffect(() => {
        fetch("https://murmuring-peak-29089.herokuapp.com/api").then(
            response => response.json()
        ).then(
            data => {
                setOgMint(Date.parse(data.ogMintDate))
                setWlMint(Date.parse(data.wlMintDate))
                setNormalMint(Date.parse(data.normalMintDate))
            }
        )
    }, [])

    
    const time = () => {
        if(ogMint*wlMint*normalMint===0) return
        let now =  Date.parse(new Date(Date.now()).toUTCString())
        
        let ogCount = ogMint - now
        let wlCount = wlMint - now
        let normalCount =normalMint - now
        let tempArr = [ogCount,wlCount,normalCount]
        let finalArr = tempArr.map((a)=>{
            if(a<=0){
                return "Mint Time has came for this role"
            }
            else{
               let day = (a/(1000*60*60*24))
               let hours = (day%1)*24
               let minutes = (hours%1)*60
               let seconds = (minutes%1)*60
                return `${Math.floor(day)}/${Math.floor(hours)}/${Math.floor(minutes)}/${Math.round(seconds)}`               

            }
        })
        setOgMintCount(finalArr[0])
        setWlMintCount(finalArr[1])
        setNormalMintCount(finalArr[2])

    }

    setInterval(time,1000)

    return(
            <ul>
                <li> <h3>{` Og mint countdown: ${ogMintCount}`}</h3></li>
                <li><h3>{` Wl mint countdown: ${wlMintCount}`}</h3></li>
                <li><h3>{` Normal mint countdown: ${normalMintCount}`}</h3></li>
            </ul>
    )

    

}

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
            <ToastContainer />
        </ConnectionProvider>

    );
};

const Content: FC = () => {
    
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
    const wallet = useAnchorWallet();
    const { connection } = useConnection();
    const programID = new web3.PublicKey(idl.metadata.address);
    let hasPerm = false;
    let mintAddress = "";



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
            const price = data.price
            const vaultWallet = data.vaultWallet
            console.log(hasPerm, "---", mintAddress)
            if (!hasPerm) {
                toast.error('Your wallet doesnt have permission to mint right now!', {
                    position: "top-right",
                    autoClose: 10000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                });
                console.log("no perm")

                return
            }
            if(!mintAddress) {
                toast.error('NFTs are finished!', {
                    position: "top-right",
                    autoClose: 10000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                });
                console.log("no mint")
                return
            }
            mintOne(mintAddress, price, vaultWallet)

        } catch (err) {

            console.log(err)
        }
    }

    const mintOne = async (pickedNft: string, price: number, vaultWallet: string) => {
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
            console.log(vaultWallet)
            console.log(price)
            tx.add(
                await SystemProgram.transfer({
                    fromPubkey: wallet.publicKey,
                    toPubkey: new web3.PublicKey(vaultWallet),
                    lamports: price,
                })
            );
            try {

                await provider.sendAndConfirm(tx)
            } catch (error) {
                if(error instanceof WalletSignTransactionError){

                    toast.error("You have declined the transaction", {
                        position: "top-right",
                        autoClose: 10000,
                        hideProgressBar: false,
                        closeOnClick: true,
                        pauseOnHover: true,
                        draggable: true,
                        progress: undefined,
                    });
                }
                else{
                    toast.error("You don't have enough SOL to mint", {
                        position: "top-right",
                        autoClose: 10000,
                        hideProgressBar: false,
                        closeOnClick: true,
                        pauseOnHover: true,
                        draggable: true,
                        progress: undefined,
                    }); 
                }
               console.log(error)
                return
            }

            try {
                toast.success('You have successfully minted!', {
                    position: "top-right",
                    autoClose: 10000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                });
                const requestOptions = {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ wallet: wallet?.publicKey, pickedNft: pickedNft }),

                };
                let _data = await fetch('https://murmuring-peak-29089.herokuapp.com/confrim', requestOptions).then((res) => res.json()).then((data) => console.log(data))
            } catch (err) {
                toast.error('Something went wrong!', {
                    position: "top-right",
                    autoClose: 10000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                });
                console.log(err)
            }


        } catch (error) {

            toast.error('Something went wrong!', {
                position: "top-right",
                autoClose: 10000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
            });
            console.log(error)
        }



    }

   

    if (wallet) {

        return (
            <div className="App">
                <ul >
                    <li>

                        <WalletMultiButton />
                    </li>
                    <li>

                        <button className="btn btn-success" onClick={sendWallet} >Mint One</button>
                        <h2>{data}</h2>
                    </li>

                    <li>
                        
                    </li>
                </ul>
                <Time/>
                <div>

                </div>
                <div>

                </div>

            </div>
        );
    }
    else {
        return (
            <div className="App">
                <ul >
                    <li>

                        <WalletMultiButton />
                    </li>
                    <li>
                        <h1>{data}</h1>
                    </li>
                    <li>
                   
                    </li>
                </ul>
                <Time/>

            </div>

        );
    }
};
