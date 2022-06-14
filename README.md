## How to test

First, copy the `Voting.sol` code in Remix IDE and deploy it.

Then, you'll be able to call the `addVoter` function with your deploying address.

Once you added multiple voters, you need to call the `startProposalRegistration` function
which will end the `addVoter` session and allow you to add proposals with the `addProposal` function. 
Only whitelisted addresses can add proposals. If the owner has not been whitelisted, he won't be able to participate.

Once you added multiple proposals, you need to call the `endProposalRegistration` function to end this session.
Then, start the voting session by calling `startVotingSession` function. Voters will be able to vote using the `vote` method.

To end the voting session, call the `endVotingSession` function. Finally, the owner must call the `tallyVotes` method.
Everyone will then be able to call the `getWinner` function and retrieve the winning proposal.

## Notes

I started using the `Ownable.sol` contract from OpenZeppelin but then I switched to `AccessControl.sol` 
which is a more advanced contract to deal with access control. This is useful to handle multiple roles (`DEFAULT_ADMIN_ROLE` and `VOTER_ROLE` here).

If there are 2 winning proposals (max + same vote count) then the first one will be chosen. This may not be the behaviour we want.
One possible solution would be to prevent ending the vote session if this case happen. 
An other solution would be to allow the owner openning the vote session again if the case happen in the `tallyVotes` function.
