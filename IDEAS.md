# General Ideas
- would be nice to organize the specs -- at least isoalte true e2es from tests that can run at sim layer entirely?
- more generalization of commands -- ideally the whole sim is driveable through commands?
- could surface command strings in the sim as we're inputting them somehow
- more backgrounds... maybe more procedurality within the backgrounds
- more clear combat mechanics -- go into attack phase with lifecycle, warmup, hit state, recover
- _only_ show combat attack (frame 3) when actually dealing damage; could set a tempvar but better if the renderer can identify 'this happened in the last turn, i should display attack frame'
- make better/any use of frame 4 (stun/prone) at least for involuntary throw
- thought/speech bubbles to display current logic?
- isometric view
  - replicates our existing simple orthogonal battlestrip view
  - adds y-offset/staggered rows ...
  - stacks rows a bit, _maybe_ starts to color shift units further away but _doesn't_ try to scale them cinematically
  - otherwise maintain exact same logic
  - render weather effects/particles clearly as hovering over specific squares

