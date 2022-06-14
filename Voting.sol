// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title Voting
 * @dev Implements voting process
 */
contract Voting is Ownable, AccessControl {
    bytes32 public constant VOTER_ROLE = keccak256("VOTER_ROLE");

    uint256 private winningProposalId;

    struct Voter {
        bool isRegistered;
        bool hasVoted;
        uint256 votedProposalId;
    }

    struct Proposal {
        string description; // maybe change to bytes32 (limit length)
        uint256 voteCount;
    }

    enum WorkflowStatus {
        RegisteringVoters,
        ProposalsRegistrationStarted,
        ProposalsRegistrationEnded,
        VotingSessionStarted,
        VotingSessionEnded,
        VotesTallied
    }

    WorkflowStatus public activeStatus;

    mapping(address => Voter) public voters;

    Proposal[] public proposals;

    event VoterRegistered(address voterAddress);
    event WorkflowStatusChange(
        WorkflowStatus previousStatus,
        WorkflowStatus newStatus
    );
    event ProposalRegistered(uint256 proposalId);
    event Voted(address voter, uint256 proposalId);

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    modifier onlyIfStatus(WorkflowStatus status) {
        require(status == activeStatus, "Wrong active workflow status");
        _;
    }

    function updateStatus(WorkflowStatus newStatus) private {
        WorkflowStatus previousStatus = activeStatus;
        activeStatus = newStatus;

        emit WorkflowStatusChange(previousStatus, activeStatus);
    }

    function startProposalRegistration()
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        onlyIfStatus(WorkflowStatus.RegisteringVoters)
    {
        updateStatus(WorkflowStatus.ProposalsRegistrationStarted);
    }

    function endProposalRegistration()
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        onlyIfStatus(WorkflowStatus.ProposalsRegistrationStarted)
    {
        updateStatus(WorkflowStatus.ProposalsRegistrationEnded);
    }

    function startVotingSession()
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        onlyIfStatus(WorkflowStatus.ProposalsRegistrationEnded)
    {
        updateStatus(WorkflowStatus.VotingSessionStarted);
    }

    function endVotingSession()
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        onlyIfStatus(WorkflowStatus.VotingSessionStarted)
    {
        updateStatus(WorkflowStatus.VotingSessionEnded);
    }

    /**
     * @dev Give 'voter' the right to vote on this voting session. May only be called by owner.
     * @param voter address of voter
     */
    function addVoter(address voter)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        onlyIfStatus(WorkflowStatus.RegisteringVoters)
    {
        require(!voters[voter].isRegistered, "Voter already registed");
        voters[voter].isRegistered = true;
        grantRole(VOTER_ROLE, voter);

        emit VoterRegistered(voter);
    }

    /**
     * @dev Add proposal with 'description' to the proposals array.
     * @param description proposal description
     */
    function addProposal(string memory description)
        external
        onlyRole(VOTER_ROLE)
        onlyIfStatus(WorkflowStatus.ProposalsRegistrationStarted)
    {
        proposals.push(Proposal(description, 0));

        emit ProposalRegistered(proposals.length - 1);
    }

    /**
     * @dev Give your vote to proposal 'proposals[proposal].description'.
     * @param proposal index of proposal in the proposals array
     */
    function vote(uint256 proposal)
        external
        onlyRole(VOTER_ROLE)
        onlyIfStatus(WorkflowStatus.VotingSessionStarted)
    {
        Voter storage sender = voters[msg.sender];
        require(!sender.hasVoted, "Already voted.");
        sender.hasVoted = true;
        sender.votedProposalId = proposal;

        // If 'proposal' is out of the range of the array,
        // this will throw automatically and revert all
        // changes.
        proposals[proposal].voteCount += 1;

        emit Voted(msg.sender, proposal);
    }

    /**
     * @dev Computes the winning proposal taking all previous votes into account.
     */
    function tallyVotes()
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        onlyIfStatus(WorkflowStatus.VotingSessionEnded)
    {
        uint256 winningVoteCount = 0;
        for (uint256 p = 0; p < proposals.length; p++) {
            if (proposals[p].voteCount > winningVoteCount) {
                winningVoteCount = proposals[p].voteCount;
                winningProposalId = p;
            }
        }

        updateStatus(WorkflowStatus.VotesTallied);
    }

    /**
     * @return _winningProposalId index of winning proposal in the proposals array
     */
    function getWinner()
        external
        view
        onlyIfStatus(WorkflowStatus.VotesTallied)
        returns (Proposal memory)
    {
        return proposals[winningProposalId];
    }
}
